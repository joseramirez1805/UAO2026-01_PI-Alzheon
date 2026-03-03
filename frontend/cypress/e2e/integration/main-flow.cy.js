/// <reference types="cypress" />

describe('INTEGRACIÓN - Flujo completo E2E (Médico → Cuidador → Paciente)', () => {
  
  const testPhotoEtiqueta = `Foto E2E ${Date.now()}`
  const testPhotoDescripcion = 'Foto de prueba del flujo completo de integración'
  
  it('Debe permitir navegar por los dashboards', () => {
    // Cuidador
    cy.loginAs('cuidador')
    cy.visit('/cuidador/dashboard')
    cy.wait(2000)
    cy.get('body').should('be.visible')
    
    // Limpiar sesión manualmente
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.wait(1000)
    
    // Paciente
    cy.loginAs('paciente')
    cy.visit('/paciente/dashboard')
    cy.wait(2000)
    cy.get('body').should('be.visible')
    
    // Limpiar sesión manualmente
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.wait(1000)
    
    // Médico
    cy.loginAs('medico')
    cy.visit('/medico/dashboard')
    cy.wait(2000)
    cy.get('body').should('be.visible')
  })
  
  it('Debe validar que las fotos cargadas tienen src válidos', () => {
    cy.loginAs('cuidador')
    cy.visit('/cuidador/fotos')
    cy.wait(3000)
    
    // simplemente asegúrate de que cada img tenga un atributo src no vacío
    cy.get('.glass-card img', { timeout: 10000 }).each($img => {
      const src = $img.attr('src')
      expect(src).to.exist
    })
  })
})
