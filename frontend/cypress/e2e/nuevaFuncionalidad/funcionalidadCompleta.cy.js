/// <reference types="cypress" />

describe('Prueba de funcionalidad - Prueba Cognitiva', () => {
    const pruebaMock = {
        _id: 'prueba-1',
        primeraSecuenciaImagenes: [
        { url: 'https://placehold.co/800x600/111/fff?text=1', orden: 0 },
        { url: 'https://placehold.co/800x600/111/fff?text=2', orden: 1 },
        { url: 'https://placehold.co/800x600/111/fff?text=3', orden: 2 }
        ],
        segundaSecuenciaImagenes: [
        { url: 'https://placehold.co/800x600/111/fff?text=4', orden: 3 },
        { url: 'https://placehold.co/800x600/111/fff?text=5', orden: 4 }
        ],
        pregunta: '¿Cuál es tu color favorito?',
        ordenCorrecto: [0, 1, 2, 3, 4],
        estado: 'en_progreso'
    }

    beforeEach(() => {
        cy.intercept('POST', '**/api/pruebas/iniciar', { statusCode: 200, body: { prueba: pruebaMock } }).as('iniciarPrueba')
        cy.intercept('POST', `**/api/pruebas/${pruebaMock._id}/primera-secuencia`, { statusCode: 200, body: { ok: true } }).as('primeraSecuencia')
        cy.intercept('POST', `**/api/pruebas/${pruebaMock._id}/segunda-secuencia`, { statusCode: 200, body: { ok: true } }).as('segundaSecuencia')
        cy.intercept('POST', `**/api/pruebas/${pruebaMock._id}/respuesta-verbal`, { statusCode: 200, body: { ok: true } }).as('respuestaVerbal')
        cy.intercept('POST', `**/api/pruebas/${pruebaMock._id}/finalizar`, {
        statusCode: 200,
        body: { resultados: { puntajeOrdenamiento: 100, tiempoCompletado: 5 } }
        }).as('finalizarPrueba')

        cy.loginAs('paciente')
        cy.url({ timeout: 10000 }).should('include', '/paciente')
    })

    it('Existe la tarjeta y botón', () => {
        cy.contains('Prueba de memoria').should('be.visible')
        cy.contains('Iniciar prueba').should('be.visible')
    })

    it('Abre el modal con instrucciones', () => {
        cy.contains('Prueba de memoria').parent().within(() => {
        cy.contains('Iniciar prueba').click()
        })

        cy.get('.glass-panel').should('be.visible')
        cy.contains('Prueba Cognitiva').should('be.visible')
        cy.contains('📋 Instrucciones de la Prueba').should('be.visible')
        cy.contains('Comenzar Prueba').should('be.visible')
    })

    it('Flujo mínimo hasta ordenamiento', () => {
        cy.contains('Prueba de memoria').parent().within(() => {
        cy.contains('Iniciar prueba').click()
    })

        cy.wait('@iniciarPrueba')
        cy.contains('Comenzar Prueba').click()

        const total = pruebaMock.primeraSecuenciaImagenes.length + pruebaMock.segundaSecuenciaImagenes.length

        for (let i = 0; i < total; i++) {
            cy.get('button').contains(/Siguiente Imagen|Continuar/).click()
            cy.wait(150)
        }

        cy.wait('@primeraSecuencia')
        cy.wait('@segundaSecuencia')

        cy.get('textarea').type('Azul')
        cy.contains(/^Continuar$/).click()
        cy.wait('@respuestaVerbal')

        cy.contains('🔢 Ordenamiento').should('be.visible')
        cy.get('.grid img').should('have.length', total)
    })

    it('Completa la prueba y muestra resultados', () => {
        // Abrir modal desde dashboard
        cy.contains('Prueba de memoria').parent().within(() => {
        cy.contains('Iniciar prueba').click()
    })

    cy.wait('@iniciarPrueba')

  // Comenzar prueba
    cy.contains('Comenzar Prueba').click()

    const total =
    pruebaMock.primeraSecuenciaImagenes.length +
    pruebaMock.segundaSecuenciaImagenes.length

  // Avanzar secuencias
    for (let i = 0; i < total; i++) {
        cy.get('button').contains(/Siguiente Imagen|Continuar/).click()
        cy.wait(120)
    }

    cy.wait('@primeraSecuencia')
    cy.wait('@segundaSecuencia')

    // Respuesta verbal
    cy.get('textarea[placeholder="Escribe tu respuesta aquí..."]').type('Azul')
    cy.contains(/^Continuar$/).click()
    cy.wait('@respuestaVerbal')

    // Ordenamiento → seleccionar todas las imágenes
    // Seleccionar imágenes
    cy.get('.grid img').each(($img) => {
        cy.wrap($img).click()
    })

    // Finalizar dentro del modal (glass panel)
    cy.get('.glass-panel')
    .contains('Finalizar Prueba')
    .should('be.visible')
    .click()

    cy.wait('@finalizarPrueba')

    // Resultados visibles
    cy.contains('Ordenamiento').should('be.visible')
    cy.contains('Tiempo').should('be.visible')
})
})