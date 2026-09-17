import { AuthenticationClient, Scopes } from '@aps_sdk/authentication';
import { OssClient, Region, PolicyKey, type ObjectDetails } from '@aps_sdk/oss';
import { ModelDerivativeClient, View, OutputType } from '@aps_sdk/model-derivative';
import { Duration, Effect, Option, Schedule, Stream } from 'effect';
import { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_BUCKET } from '../config';
import { ApsRequestError, statusOf, isTransientError, urnify } from './apsHelpers';

const authenticationClient = new AuthenticationClient();
const ossClient = new OssClient();
const modelDerivativeClient = new ModelDerivativeClient();

function callAps<A>(operation: string, promise: () => Promise<A>): Effect.Effect<A, ApsRequestError> {
  return Effect.tryPromise({
    try: promise,
    catch: (cause) => new ApsRequestError({ operation, status: statusOf(cause), cause }),
  });
}

const retryTransient = <A>(effect: Effect.Effect<A, ApsRequestError>) =>
  effect.pipe(
    Effect.retry({
      schedule: Schedule.exponential(Duration.millis(300)).pipe(Schedule.intersect(Schedule.recurs(3))),
      while: isTransientError,
    })
  );

const getInternalTokenEffect: Effect.Effect<string, ApsRequestError> = callAps('getInternalToken', () =>
  authenticationClient.getTwoLeggedToken(APS_CLIENT_ID, APS_CLIENT_SECRET, [
    Scopes.DataRead,
    Scopes.DataCreate,
    Scopes.DataWrite,
    Scopes.BucketCreate,
    Scopes.BucketRead,
  ])
).pipe(
  retryTransient,
  Effect.map((credentials) => credentials.access_token)
);

// APS 2-legged tokens are valid for ~1h; cache for a bit less so we never race
// an in-flight request against the token expiring mid-call.
const cachedTokenEffect = Effect.runSync(Effect.cachedWithTTL(getInternalTokenEffect, Duration.minutes(50)));

const getViewerTokenEffect = callAps('getViewerToken', () =>
  authenticationClient.getTwoLeggedToken(APS_CLIENT_ID, APS_CLIENT_SECRET, [Scopes.ViewablesRead])
).pipe(retryTransient);

function ensureBucketExistsEffect(bucketKey: string): Effect.Effect<void, ApsRequestError> {
  return cachedTokenEffect.pipe(
    Effect.flatMap((accessToken) =>
      callAps('getBucketDetails', () => ossClient.getBucketDetails(bucketKey, { accessToken })).pipe(
        Effect.catchIf(
          (err) => err.status === 404,
          () =>
            callAps('createBucket', () =>
              ossClient.createBucket(Region.Us, { bucketKey, policyKey: PolicyKey.Persistent }, { accessToken })
            )
        )
      )
    ),
    retryTransient,
    Effect.asVoid
  );
}

function listObjectsEffect(): Effect.Effect<ReadonlyArray<ObjectDetails>, ApsRequestError> {
  return ensureBucketExistsEffect(APS_BUCKET).pipe(
    Effect.zipRight(cachedTokenEffect),
    Effect.flatMap((accessToken) =>
      Stream.paginateEffect(undefined as string | undefined, (startAt) =>
        callAps('getObjects', () => ossClient.getObjects(APS_BUCKET, { limit: 64, startAt, accessToken })).pipe(
          retryTransient,
          Effect.map((resp) => {
            const nextStartAt = resp.next ? (new URL(resp.next).searchParams.get('startAt') ?? undefined) : undefined;
            return [resp.items ?? [], Option.fromNullable(nextStartAt)] as const;
          })
        )
      ).pipe(Stream.runFold([] as ReadonlyArray<ObjectDetails>, (acc, page) => [...acc, ...page]))
    )
  );
}

function uploadObjectEffect(objectName: string, filePath: string) {
  return ensureBucketExistsEffect(APS_BUCKET).pipe(
    Effect.zipRight(cachedTokenEffect),
    Effect.flatMap((accessToken) =>
      callAps('uploadObject', () => ossClient.uploadObject(APS_BUCKET, objectName, filePath, { accessToken }))
    ),
    retryTransient
  );
}

function deleteObjectEffect(objectName: string) {
  return cachedTokenEffect.pipe(
    Effect.flatMap((accessToken) =>
      callAps('deleteObject', () => ossClient.deleteObject(APS_BUCKET, objectName, { accessToken }))
    ),
    retryTransient
  );
}

function translateObjectEffect(urn: string, rootFilename: string | undefined) {
  return cachedTokenEffect.pipe(
    Effect.flatMap((accessToken) =>
      callAps('startJob', () =>
        modelDerivativeClient.startJob(
          {
            input: { urn, compressedUrn: !!rootFilename, rootFilename },
            output: { formats: [{ views: [View._2d, View._3d], type: OutputType.Svf2 }] },
          },
          { accessToken }
        )
      )
    ),
    retryTransient,
    Effect.map((job) => job.result)
  );
}

function getManifestEffect(urn: string) {
  return cachedTokenEffect.pipe(
    Effect.flatMap((accessToken) =>
      callAps('getManifest', () => modelDerivativeClient.getManifest(urn, { accessToken })).pipe(
        retryTransient,
        Effect.map((manifest): typeof manifest | null => manifest),
        Effect.catchIf(
          (err) => err.status === 404,
          () => Effect.succeed(null)
        )
      )
    )
  );
}

export const getViewerToken = () => Effect.runPromise(getViewerTokenEffect);
export const ensureBucketExists = (bucketKey: string) => Effect.runPromise(ensureBucketExistsEffect(bucketKey));
export const listObjects = () => Effect.runPromise(listObjectsEffect());
export const uploadObject = (objectName: string, filePath: string) =>
  Effect.runPromise(uploadObjectEffect(objectName, filePath));
export const deleteObject = (objectName: string) => Effect.runPromise(deleteObjectEffect(objectName));
export const translateObject = (urn: string, rootFilename: string | undefined) =>
  Effect.runPromise(translateObjectEffect(urn, rootFilename));
export const getManifest = (urn: string) => Effect.runPromise(getManifestEffect(urn));
export { urnify };
