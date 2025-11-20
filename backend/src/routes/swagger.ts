import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
const router = express.Router();
const spec = YAML.load(path.join(__dirname,'..','..','openapi.yaml'));
router.use('/', swaggerUi.serve, swaggerUi.setup(spec));
export default router;
