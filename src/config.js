require('dotenv').config({ path: require('path').join(__dirname, '.env') });

let { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_BUCKET, PORT, SESSION_SECRET, LOGIN_PASSPHRASE } = process.env;
if (!APS_CLIENT_ID || !APS_CLIENT_SECRET) {
    console.warn('Missing some of the environment variables.');
    process.exit(1);
}
APS_BUCKET = APS_BUCKET || `${APS_CLIENT_ID.toLowerCase()}-basic-app`;
PORT = PORT || 8080;
SESSION_SECRET = SESSION_SECRET || require('crypto').randomBytes(32).toString('hex');
LOGIN_PASSPHRASE = LOGIN_PASSPHRASE || 'hello world';

module.exports = {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    APS_BUCKET,
    PORT,
    SESSION_SECRET,
    LOGIN_PASSPHRASE
};