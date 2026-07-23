import { createApplication } from './app/bootstrap/create-application.js';
import { parseEnvironment } from './app/config/environment.js';

const environment = parseEnvironment(process.env);
const app = await createApplication(process.env);
await app.listen(environment.port, '0.0.0.0');
