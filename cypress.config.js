import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // ===== URL Base =====
    baseUrl: 'http://localhost:3000',
    
    // ===== Timeouts =====
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    
    // ===== Viewport =====
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // ===== Screenshot & Vídeo =====
    screenshotOnRunFailure: true,
    videoOnFailure: true,
    video: true,
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    
    // ===== Diretórios =====
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    
    // ===== Ações =====
    waitForAnimations: true,
    animationDistanceThreshold: 5,
    
    // ===== Retentativas (após falha) =====
    retries: {
      runMode: 1,
      openMode: 0
    },
    
    // ===== Comportamento =====
    chromeWebSecurity: false,
    experimentalMemoryManagement: true,
    
    // ===== Request/Response =====
    redirectionLimit: 20,
    numTestsKeptInMemory: 0
  },
  
  // ===== Configuração do Navegador =====
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
      viteConfig: {
        resolve: {
          alias: {
            '@': '/src'
          }
        }
      }
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.js'
  }
});
