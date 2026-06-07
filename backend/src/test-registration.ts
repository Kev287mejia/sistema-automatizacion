import dotenv from 'dotenv';
dotenv.config();

import { IntentClassifier } from './services/ai/IntentClassifier';
import { ActionRouter } from './routers/ActionRouter';

async function testCurrentRegistration() {
  const classifier = new IntentClassifier();
  const router = new ActionRouter();

  const phrase1 = "Registrar participante";
  const phrase2 = "Inscribirme al taller";

  console.log('--- TEST 1 ---');
  const d1 = await classifier.classify(phrase1);
  console.log('Intent:', d1.intent);
  const r1 = await router.route(d1, phrase1);
  console.log('Respuesta:', r1.fallbackText || r1.actionType);

  console.log('\n--- TEST 2 ---');
  const d2 = await classifier.classify(phrase2);
  console.log('Intent:', d2.intent);
  const r2 = await router.route(d2, phrase2);
  console.log('Respuesta:', r2.fallbackText || r2.actionType);
}

testCurrentRegistration().catch(console.error);
