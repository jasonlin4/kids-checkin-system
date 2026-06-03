console.error(
  'This project no longer runs an Express server process. ' +
  'Use Vercel Functions under /api, run "npm run migrate:hosted-db", and deploy on Vercel.'
);
process.exit(1);
