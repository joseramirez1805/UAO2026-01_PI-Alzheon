// ***********************************************
// Comandos personalizados para Alzheon
// ***********************************************

// ========== AUTH COMMANDS ==========

/**
 * Login como usuario con rol específico
 * @param {string} role - 'paciente', 'cuidador' o 'medico'
 */
Cypress.Commands.add('loginAs', (role) => {
  const credentials = {
    paciente: {
      email: Cypress.env('PACIENTE_EMAIL') || 'paciente@test.com',
      password: Cypress.env('PACIENTE_PASSWORD') || 'Test1234!'
    },
    cuidador: {
      email: Cypress.env('CUIDADOR_EMAIL') || 'cuidador@test.com',
      password: Cypress.env('CUIDADOR_PASSWORD') || 'Test1234!'
    },
    medico: {
      email: Cypress.env('MEDICO_EMAIL') || 'medico@test.com',
      password: Cypress.env('MEDICO_PASSWORD') || 'Test1234!'
    }
  }

  const user = credentials[role]
  
  cy.visit('/login')
  cy.get('input[type="email"]').type(user.email)
  cy.get('input[type="password"]').type(user.password)
  cy.get('button[type="submit"]').click()
  
  // Esperar a que se complete el login y redirija
  cy.url().should('not.include', '/login')
  cy.wait(1000) // Esperar que Redux se actualice
})

/**
 * Login directo vía API (más rápido para setup)
 */
Cypress.Commands.add('apiLogin', (email, password) => {
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL') || 'http://localhost:5500'}/api/login`,
    body: { email, password }
  }).then((response) => {
    expect(response.status).to.eq(200)
    return response.body
  })
})

/**
 * Logout del usuario actual
 */
Cypress.Commands.add('logout', () => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL') || 'http://localhost:5500'}/api/logout`,
    failOnStatusCode: false
  })
  cy.clearCookies()
  cy.clearLocalStorage()
})

// ========== UPLOAD COMMANDS ==========

/**
 * Subir imagen a través del formulario del cuidador
 */
Cypress.Commands.add('uploadPhotoAsCuidador', (fileName = 'test-image.jpg', etiqueta = 'Foto de prueba', descripcion = 'Descripción de prueba') => {
  cy.fixture(fileName, 'binary')
    .then(Cypress.Blob.binaryStringToBlob)
    .then(fileContent => {
      cy.get('input[type="file"]').attachFile({
        fileContent,
        fileName,
        mimeType: 'image/jpeg'
      })
    })
  
  cy.get('input[name="etiqueta"]').type(etiqueta)
  cy.get('textarea[name="descripcion"]').type(descripcion)
  cy.get('button[type="submit"]').contains('Subir').click()
  
  // Esperar confirmación
  cy.contains('Foto subida exitosamente', { timeout: 10000 }).should('be.visible')
})

/**
 * Grabar audio como paciente (simular)
 */
Cypress.Commands.add('recordAudioAsPaciente', (photoId, descripcion = 'Esta es una grabación de prueba') => {
  // Seleccionar foto
  cy.get(`[data-photo-id="${photoId}"]`).click()
  
  // Usar descripción de texto en lugar de audio
  cy.get('textarea[name="descripcionTexto"]').type(descripcion)
  cy.get('button').contains('Guardar descripción').click()
  
  // Esperar confirmación
  cy.contains('Grabación guardada', { timeout: 10000 }).should('be.visible')
})

// ========== UI VALIDATION COMMANDS ==========

/**
 * Verificar que el elemento tiene efecto glassmorphism
 */
Cypress.Commands.add('checkGlassmorphism', { prevSubject: true }, (subject) => {
  cy.wrap(subject)
    .should('have.css', 'backdrop-filter')
    .and('match', /blur/)
})

/**
 * Verificar dashboard según rol
 */
Cypress.Commands.add('checkDashboard', (role) => {
  const dashboardTexts = {
    paciente: ['Mis Fotos', 'Mis Grabaciones', 'Progreso Semanal'],
    cuidador: ['Fotos del Paciente', 'Estadísticas', 'Subir Foto'],
    medico: ['Mis Pacientes', 'Estadísticas', 'Asignar Paciente']
  }
  
  dashboardTexts[role].forEach(text => {
    cy.contains(text).should('be.visible')
  })
})

/**
 * Esperar a que Redux termine de cargar
 */
Cypress.Commands.add('waitForRedux', () => {
  cy.wait(500)
  cy.window().its('store').should('exist')
})

// ========== API COMMANDS ==========

/**
 * Request a la API con autenticación
 */
Cypress.Commands.add('apiRequest', (method, endpoint, body = null) => {
  const options = {
    method,
    url: `${Cypress.env('API_URL') || 'http://localhost:5500'}/api${endpoint}`,
    failOnStatusCode: false
  }
  
  if (body) {
    options.body = body
  }
  
  return cy.request(options)
})

// ========== IMAGE URL VALIDATION COMMANDS ==========

/**
 * Validar que una URL de imagen es válida y accesible.
 * También acepta data URIs generados desde Mongo.
 */
Cypress.Commands.add('validateImageUrl', (url) => {
  expect(url).to.exist
  if (url.startsWith('data:')) {
    // formato: data:image/<tipo>;base64,<datos>
    expect(url).to.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/]+=*$/)
  } else {
    // si es una URL remota opcionalmente podemos verificar que pertenece a R2
    const r2prefix = Cypress.env('R2_PUBLIC_URL') || 'r2.dev'
    if (url.includes('http') && url.includes('r2.dev')) {
      expect(url).to.include(r2prefix)
    }
    cy.request(url).then((response) => {
      expect(response.status).to.eq(200)
      expect(response.headers['content-type']).to.match(/image/)
    })
  }
})

// ========== HELPER COMMANDS ==========

/**
 * Obtener ID de usuario desde la cookie JWT
 */
Cypress.Commands.add('getUserIdFromCookie', () => {
  return cy.getCookie('token').then((cookie) => {
    if (!cookie) return null
    const payload = JSON.parse(atob(cookie.value.split('.')[1]))
    return payload._id || payload.id
  })
})