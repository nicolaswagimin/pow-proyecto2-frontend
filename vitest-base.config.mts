import { defineConfig } from 'vitest/config';

// Configuración extra de Vitest para `ng test`.
export default defineConfig({
  test: {
    globals: true,
    // Angular entrega a Vitest archivos compilados con nombres estables; con la caché de módulos
    // activada, Vitest reutiliza versiones viejas y las pruebas no ven los cambios.
    fsModuleCache: false,
  },
});
