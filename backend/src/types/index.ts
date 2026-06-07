// Archivo base para exportar todos los tipos globales del sistema
// Aquí se definirán las interfaces que no pertenezcan exclusivamente a un dominio
export interface HealthStatus {
  status: 'ok' | 'error';
  message: string;
}
