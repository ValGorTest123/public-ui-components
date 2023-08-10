// Cypress component test spec file
import { KongManagerKeyFormConfig, KonnectKeyFormConfig } from '../types'
import { key1, keySets, kid, jwkString } from '../../fixtures/mockData'
import KeyForm from './KeyForm.vue'
import { EntityBaseForm } from '@kong-ui-public/entities-shared'

const cancelRoute = { name: 'keys-list' }

const baseConfigKonnect:KonnectKeyFormConfig = {
  app: 'konnect',
  controlPlaneId: '1234-abcd-ilove-cats',
  apiBaseUrl: '/us/kong-api/konnect-api',
  cancelRoute,
}

const baseConfigKM:KongManagerKeyFormConfig = {
  app: 'kongManager',
  workspace: 'default',
  apiBaseUrl: '/kong-manager',
  cancelRoute,
}

describe('<KeyForm />', () => {
  describe('Kong Manager', () => {
    const interceptKMKeySets = (params?: {
      mockData?: object
      alias?: string
    }) => {
      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKM.apiBaseUrl}/${baseConfigKM.workspace}/key-sets*`,
        },
        {
          statusCode: 200,
          body: params?.mockData ?? keySets,
        },
      ).as(params?.alias ?? 'getKeySets')
    }

    const interceptKM = (params?: {
      mockData?: object
      alias?: string
    }) => {
      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKM.apiBaseUrl}/${baseConfigKM.workspace}/keys/*`,
        },
        {
          statusCode: 200,
          body: params?.mockData ?? key1,
        },
      ).as(params?.alias ?? 'getKey')
    }

    const interceptUpdate = (status = 200): void => {
      cy.intercept(
        {
          method: 'PATCH',
          url: `${baseConfigKM.apiBaseUrl}/${baseConfigKM.workspace}/keys/*`,
        },
        {
          statusCode: status,
          body: { ...key1, tags: ['tag1', 'tag2'] },
        },
      ).as('updateKey')
    }

    it('should show create form', () => {
      interceptKMKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      cy.get('.kong-ui-entities-keys-form form').should('be.visible')
      // button state
      cy.getTestId('form-cancel').should('be.visible')
      cy.getTestId('form-submit').should('be.visible')
      cy.getTestId('form-cancel').should('be.enabled')
      cy.getTestId('form-submit').should('be.disabled')
      // form fields
      cy.getTestId('key-form-id').should('be.visible')
      cy.getTestId('key-form-name').should('be.visible')
      cy.getTestId('key-form-tags').should('be.visible')
      cy.getTestId('key-form-key-set').should('be.visible')
      // key sets load in select
      cy.getTestId('key-form-key-set').click()
      cy.get('.k-select-list .k-select-item .select-item-desc').should('have.length', keySets.data.length)
      cy.get(`[data-testid="k-select-item-${keySets.data[0].id}"] button`).click()
      cy.get('.kong-ui-entities-keys-form .clear-selection-icon').should('exist')
      // key formats load correctly - jwk
      cy.getTestId('key-form-jwk').should('be.visible')
      cy.getTestId('key-form-private-key').should('not.exist')
      cy.getTestId('key-form-public-key').should('not.exist')
      cy.get('[data-testid="key-format-container"] .k-select [role="button"]').click()
      cy.getTestId('k-select-item-jwk').should('be.visible')
      cy.getTestId('k-select-item-pem').should('be.visible')
      // key formats load correctly - pem
      cy.getTestId('k-select-item-pem').click()
      cy.getTestId('key-form-jwk').should('not.exist')
      cy.getTestId('key-form-private-key').should('be.visible')
      cy.getTestId('key-form-public-key').should('be.visible')
    })

    it('should accept key set id from props in create form', () => {
      interceptKMKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
          fixedKeySetId: key1.set.id,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      cy.get('.k-select .is-readonly .custom-selected-item').should('contain.text', key1.set.name)
    })

    it('should change key set id when props.keySetId changed', () => {
      interceptKMKeySets()

      cy
        .mount(KeyForm, {
          props: {
            config: baseConfigKM,
            fixedKeySetId: key1.set.id,
          },
        })
        .then(({ wrapper }) => wrapper)
        .as('vueWrapper')

      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      cy.get('.k-select .is-readonly .custom-selected-item').should('contain.text', key1.set.name)

      cy.get('@vueWrapper').then(async (wrapper: any) => {
        await wrapper.setProps({ fixedKeySetId: keySets.data[1].id })
        cy.get('.k-select .is-readonly .custom-selected-item').should('contain.text', keySets.data[1].name)
      })
    })

    it('should disable reset button when key set id is fixed', () => {
      interceptKMKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
          fixedKeySetId: key1.set.id,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form .clear-selection-icon').should('not.exist')
    })

    it('should correctly handle button state - create', () => {
      interceptKMKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // default button state
      cy.getTestId('form-cancel').should('be.visible')
      cy.getTestId('form-submit').should('be.visible')
      cy.getTestId('form-cancel').should('be.enabled')
      cy.getTestId('form-submit').should('be.disabled')
      // enables save when required fields have values
      cy.getTestId('key-form-id').type(kid)
      cy.getTestId('key-form-name').type('tk-meowstersmith')
      cy.getTestId('key-form-key-set').click()
      cy.get(`[data-testid="k-select-item-${keySets.data[0].id}"] button`).click()
      cy.getTestId('key-form-jwk').type(jwkString, { delay: 0 })
      cy.getTestId('form-submit').should('be.enabled')
      // disables save when required field is cleared
      cy.getTestId('key-form-id').clear()
      cy.getTestId('form-submit').should('be.disabled')
    })

    it('should allow partial match while filtering with key set name', () => {
      interceptKMKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // search
      cy.getTestId('key-form-key-set').should('be.visible')
      cy.getTestId('key-form-key-set').type(key1.set.name.slice(0, 5))
      // click kselect item
      cy.getTestId(`k-select-item-${key1.set.id}`).should('be.visible')
      cy.get(`[data-testid="k-select-item-${key1.set.id}"] button`).click()
      cy.get('.k-select .custom-selected-item').should('contain.text', key1.set.name)
    })

    it('should allow exact match while filtering with key set name', () => {
      interceptKMKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // search
      cy.getTestId('key-form-key-set').should('be.visible')
      cy.getTestId('key-form-key-set').type(key1.set.name)
      // click kselect item
      cy.getTestId(`k-select-item-${key1.set.id}`).should('be.visible')
      cy.get(`[data-testid="k-select-item-${key1.set.id}"] button`).click()
      cy.get('.k-select .custom-selected-item').should('contain.text', key1.set.name)
    })

    it('should allow partial match while filtering with key set id', () => {
      interceptKMKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // search
      cy.getTestId('key-form-key-set').should('be.visible')
      cy.getTestId('key-form-key-set').type(key1.set.id.slice(0, 5))
      // click kselect item
      cy.getTestId(`k-select-item-${key1.set.id}`).should('be.visible')
      cy.get(`[data-testid="k-select-item-${key1.set.id}"] button`).click()
      cy.get('.k-select .custom-selected-item').should('contain.text', key1.set.name)
    })

    it('should allow exact match while filtering with key set id', () => {
      interceptKMKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // search
      cy.getTestId('key-form-key-set').should('be.visible')
      cy.getTestId('key-form-key-set').type(key1.set.id)
      // click kselect item
      cy.getTestId(`k-select-item-${key1.set.id}`).should('be.visible')
      cy.get(`[data-testid="k-select-item-${key1.set.id}"] button`).click()
      cy.get('.k-select .custom-selected-item').should('contain.text', key1.set.name)
    })

    it('should show edit form', () => {
      interceptKMKeySets()
      interceptKM()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
          keyId: key1.id,
        },
      })

      cy.wait('@getKeySets')
      cy.wait('@getKey')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // button state
      cy.getTestId('form-cancel').should('be.visible')
      cy.getTestId('form-submit').should('be.visible')
      cy.getTestId('form-cancel').should('be.enabled')
      cy.getTestId('form-submit').should('be.disabled')
      // form fields
      cy.getTestId('key-form-name').should('have.value', key1.name)
      key1.tags.forEach((tag: string) => {
        cy.getTestId('key-form-tags').invoke('val').then((val: string) => {
          expect(val).to.contain(tag)
        })
      })
      cy.get('.k-select .custom-selected-item').should('contain.text', key1.set.name)
    })

    it('should not accept key set id from props in edit form', () => {
      interceptKMKeySets()
      interceptKM()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
          keyId: key1.id,
          fixedKeySetId: keySets.data[1].name,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      cy.get('.k-select .custom-selected-item').should('contain.text', key1.set.name)
    })

    it('should correctly handle button state - edit', () => {
      interceptKMKeySets()
      interceptKM()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
          keyId: key1.id,
        },
      })

      cy.wait('@getKey')
      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // default button state
      cy.getTestId('form-cancel').should('be.visible')
      cy.getTestId('form-submit').should('be.visible')
      cy.getTestId('form-cancel').should('be.enabled')
      cy.getTestId('form-submit').should('be.disabled')
      // enables save when form has changes
      cy.getTestId('key-form-name').type('-edited')
      cy.getTestId('form-submit').should('be.enabled')
      // disables save when form changes are undone
      cy.getTestId('key-form-name').clear()
      cy.getTestId('key-form-name').type(key1.name)
      cy.getTestId('form-submit').should('be.disabled')
    })

    it('should handle error state - failed to load Key', () => {
      interceptKMKeySets()

      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKM.apiBaseUrl}/${baseConfigKM.workspace}/keys/*`,
        },
        {
          statusCode: 404,
          body: {},
        },
      ).as('getKey')

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
          keyId: key1.id,
        },
      })

      cy.wait('@getKeySets')
      cy.wait('@getKey')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // error state is displayed
      cy.getTestId('form-fetch-error').should('be.visible')
      // buttons and form hidden
      cy.getTestId('form-cancel').should('not.exist')
      cy.getTestId('form-submit').should('not.exist')
      cy.get('.kong-ui-entities-keys-form form').should('not.exist')
    })

    it('should handle error state - failed to load key sets', () => {
      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKM.apiBaseUrl}/${baseConfigKM.workspace}/key-sets*`,
        },
        {
          statusCode: 500,
          body: {},
        },
      ).as('getKeySets')

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      cy.getTestId('form-error').should('be.visible')
    })

    it('should handle error state - invalid cert id', () => {
      interceptKMKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      cy.getTestId('key-form-key-set').type('xxxx')
      cy.getTestId('no-search-results').should('be.visible')
      cy.getTestId('invalid-key-set-message').should('exist')
    })

    it('update event should be emitted when Key was edited', () => {
      interceptKM()
      interceptKMKeySets()
      interceptUpdate()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKM,
          keyId: key1.id,
          onUpdate: cy.spy().as('onUpdateSpy'),
        },
      }).then(({ wrapper }) => wrapper)
        .as('vueWrapper')

      cy.wait('@getKeySets')
      cy.wait('@getKey')
      cy.getTestId('key-form-tags').clear()
      cy.getTestId('key-form-tags').type('tag1,tag2')

      cy.get('@vueWrapper').then((wrapper: any) => wrapper.findComponent(EntityBaseForm)
        .vm.$emit('submit'))

      cy.wait('@updateKey')

      cy.get('@onUpdateSpy').should('have.been.calledOnce')
    })
  })

  describe('Konnect', () => {
    const interceptKonnectKeySets = (params?: {
      mockData?: object
      alias?: string
    }) => {
      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKonnect.apiBaseUrl}/api/runtime_groups/${baseConfigKonnect.controlPlaneId}/key-sets*`,
        },
        {
          statusCode: 200,
          body: params?.mockData ?? keySets,
        },
      ).as(params?.alias ?? 'getKeySets')
    }

    const interceptUpdate = (status = 200): void => {
      cy.intercept(
        {
          method: 'PUT',
          url: `${baseConfigKonnect.apiBaseUrl}/api/runtime_groups/${baseConfigKonnect.controlPlaneId}/keys/*`,
        },
        {
          statusCode: status,
          body: { ...key1, tags: ['tag1', 'tag2'] },
        },
      ).as('updateKey')
    }

    const interceptKonnect = (params?: {
      mockData?: object
      alias?: string
    }) => {
      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKonnect.apiBaseUrl}/api/runtime_groups/${baseConfigKonnect.controlPlaneId}/keys/*`,
        },
        {
          statusCode: 200,
          body: params?.mockData ?? key1,
        },
      ).as(params?.alias ?? 'getKey')
    }

    it('should show create form', () => {
      interceptKonnectKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      cy.get('.kong-ui-entities-keys-form form').should('be.visible')
      // button state
      cy.getTestId('form-cancel').should('be.visible')
      cy.getTestId('form-submit').should('be.visible')
      cy.getTestId('form-cancel').should('be.enabled')
      cy.getTestId('form-submit').should('be.disabled')
      // form fields
      cy.getTestId('key-form-id').should('be.visible')
      cy.getTestId('key-form-name').should('be.visible')
      cy.getTestId('key-form-tags').should('be.visible')
      cy.getTestId('key-form-key-set').should('be.visible')
      // key sets load in select
      cy.getTestId('key-form-key-set').click()
      cy.get('.k-select-list .k-select-item .select-item-desc').should('have.length', keySets.data.length)
      cy.get(`[data-testid="k-select-item-${keySets.data[0].id}"] button`).click()
      cy.get('.kong-ui-entities-keys-form .clear-selection-icon').should('exist')
      // key formats load correctly - jwk
      cy.getTestId('key-form-jwk').should('be.visible')
      cy.getTestId('key-form-private-key').should('not.exist')
      cy.getTestId('key-form-public-key').should('not.exist')
      cy.get('[data-testid="key-format-container"] .k-select [role="button"]').click()
      cy.getTestId('k-select-item-jwk').should('be.visible')
      cy.getTestId('k-select-item-pem').should('be.visible')
      // key formats load correctly - pem
      cy.getTestId('k-select-item-pem').click()
      cy.getTestId('key-form-jwk').should('not.exist')
      cy.getTestId('key-form-private-key').should('be.visible')
      cy.getTestId('key-form-public-key').should('be.visible')
    })

    it('should accept key set id from props in create form', () => {
      interceptKonnectKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
          fixedKeySetId: key1.set.id,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      cy.get('.k-select .is-readonly .custom-selected-item').should('contain.text', key1.set.name)
    })

    it('should change key set id when props.keySetId changed', () => {
      interceptKonnectKeySets()

      cy
        .mount(KeyForm, {
          props: {
            config: baseConfigKonnect,
            fixedKeySetId: key1.set.id,
          },
        })
        .then(({ wrapper }) => wrapper)
        .as('vueWrapper')

      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      cy.get('.k-select .is-readonly .custom-selected-item').should('contain.text', key1.set.name)

      cy.get('@vueWrapper').then(async (wrapper: any) => {
        await wrapper.setProps({ fixedKeySetId: keySets.data[1].id })
        cy.get('.k-select .is-readonly .custom-selected-item').should('contain.text', keySets.data[1].name)
      })
    })

    it('should disable reset button when key set id is fixed', () => {
      interceptKonnectKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
          fixedKeySetId: key1.set.id,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form .clear-selection-icon').should('not.exist')
    })

    it('should correctly handle button state - create', () => {
      interceptKonnectKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // default button state
      cy.getTestId('form-cancel').should('be.visible')
      cy.getTestId('form-submit').should('be.visible')
      cy.getTestId('form-cancel').should('be.enabled')
      cy.getTestId('form-submit').should('be.disabled')
      // enables save when required fields have values
      cy.getTestId('key-form-id').type(kid)
      cy.getTestId('key-form-name').type('tk-meowstersmith')
      cy.getTestId('key-form-key-set').click()
      cy.get(`[data-testid="k-select-item-${keySets.data[0].id}"] button`).click()
      cy.getTestId('key-form-jwk').type(jwkString, { delay: 0 })
      cy.getTestId('form-submit').should('be.enabled')
      // disables save when required field is cleared
      cy.getTestId('key-form-id').clear()
      cy.getTestId('form-submit').should('be.disabled')
    })

    it('should allow partial match while filtering with key set name', () => {
      interceptKonnectKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // search
      cy.getTestId('key-form-key-set').should('be.visible')
      cy.getTestId('key-form-key-set').type(key1.set.name.slice(0, 5))
      // click kselect item
      cy.getTestId(`k-select-item-${key1.set.id}`).should('be.visible')
      cy.get(`[data-testid="k-select-item-${key1.set.id}"] button`).click()
      cy.get('.k-select .custom-selected-item').should('contain.text', key1.set.name)
    })

    it('should allow exact match while filtering with key set name', () => {
      interceptKonnectKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // search
      cy.getTestId('key-form-key-set').should('be.visible')
      cy.getTestId('key-form-key-set').type(key1.set.name)
      // click kselect item
      cy.getTestId(`k-select-item-${key1.set.id}`).should('be.visible')
      cy.get(`[data-testid="k-select-item-${key1.set.id}"] button`).click()
      cy.get('.k-select .custom-selected-item').should('contain.text', key1.set.name)
    })

    it('should allow partial match while filtering with key set id', () => {
      interceptKonnectKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // search
      cy.getTestId('key-form-key-set').should('be.visible')
      cy.getTestId('key-form-key-set').type(key1.set.id.slice(0, 5))
      // click kselect item
      cy.getTestId(`k-select-item-${key1.set.id}`).should('be.visible')
      cy.get(`[data-testid="k-select-item-${key1.set.id}"] button`).click()
      cy.get('.k-select .custom-selected-item').should('contain.text', key1.set.name)
    })

    it('should allow exact match while filtering with key set id', () => {
      interceptKonnectKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // search
      cy.getTestId('key-form-key-set').should('be.visible')
      cy.getTestId('key-form-key-set').type(key1.set.id)
      // click kselect item
      cy.getTestId(`k-select-item-${key1.set.id}`).should('be.visible')
      cy.get(`[data-testid="k-select-item-${key1.set.id}"] button`).click()
      cy.get('.k-select .custom-selected-item').should('contain.text', key1.set.name)
    })

    it('should show edit form', () => {
      interceptKonnectKeySets()
      interceptKonnect()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
          keyId: key1.id,
        },
      })

      cy.wait('@getKeySets')
      cy.wait('@getKey')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // button state
      cy.getTestId('form-cancel').should('be.visible')
      cy.getTestId('form-submit').should('be.visible')
      cy.getTestId('form-cancel').should('be.enabled')
      cy.getTestId('form-submit').should('be.disabled')
      // form fields
      cy.getTestId('key-form-name').should('have.value', key1.name)
      key1.tags.forEach((tag: string) => {
        cy.getTestId('key-form-tags').invoke('val').then((val: string) => {
          expect(val).to.contain(tag)
        })
      })
      cy.get('.k-select .custom-selected-item').should('contain.text', key1.set.name)
    })

    it('should not accept key set id from props in edit form', () => {
      interceptKonnectKeySets()
      interceptKonnect()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
          keyId: key1.id,
          fixedKeySetId: keySets.data[1].name,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      cy.get('.k-select .custom-selected-item').should('contain.text', key1.set.name)
    })

    it('should correctly handle button state - edit', () => {
      interceptKonnectKeySets()
      interceptKonnect()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
          keyId: key1.id,
        },
      })

      cy.wait('@getKey')
      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // default button state
      cy.getTestId('form-cancel').should('be.visible')
      cy.getTestId('form-submit').should('be.visible')
      cy.getTestId('form-cancel').should('be.enabled')
      cy.getTestId('form-submit').should('be.disabled')
      // enables save when form has changes
      cy.getTestId('key-form-name').type('-edited')
      cy.getTestId('form-submit').should('be.enabled')
      // disables save when form changes are undone
      cy.getTestId('key-form-name').clear()
      cy.getTestId('key-form-name').type(key1.name)
      cy.getTestId('form-submit').should('be.disabled')
    })

    it('should handle error state - failed to load Key', () => {
      interceptKonnectKeySets()
      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKonnect.apiBaseUrl}/api/runtime_groups/${baseConfigKonnect.controlPlaneId}/keys/*`,
        },
        {
          statusCode: 404,
          body: {},
        },
      ).as('getKey')

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
          keyId: key1.id,
        },
      })

      cy.wait('@getKeySets')
      cy.wait('@getKey')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      // error state is displayed
      cy.getTestId('form-fetch-error').should('be.visible')
      // buttons and form hidden
      cy.getTestId('form-cancel').should('not.exist')
      cy.getTestId('form-submit').should('not.exist')
      cy.get('.kong-ui-entities-keys-form form').should('not.exist')
    })

    it('should handle error state - failed to load key sets', () => {
      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKonnect.apiBaseUrl}/api/runtime_groups/${baseConfigKonnect.controlPlaneId}/key-sets*`,
        },
        {
          statusCode: 500,
          body: {},
        },
      ).as('getKeySets')

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      cy.getTestId('form-error').should('be.visible')
    })

    it('should handle error state - invalid cert id', () => {
      interceptKonnectKeySets()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
        },
      })

      cy.wait('@getKeySets')
      cy.get('.kong-ui-entities-keys-form').should('be.visible')
      cy.getTestId('key-form-key-set').type('xxxx')
      cy.getTestId('no-search-results').should('be.visible')
      cy.getTestId('invalid-key-set-message').should('exist')
    })

    it('update event should be emitted when Key was edited', () => {
      interceptKonnect()
      interceptKonnectKeySets()
      interceptUpdate()

      cy.mount(KeyForm, {
        props: {
          config: baseConfigKonnect,
          keyId: key1.id,
          onUpdate: cy.spy().as('onUpdateSpy'),
        },
      }).then(({ wrapper }) => wrapper)
        .as('vueWrapper')

      cy.wait('@getKeySets')
      cy.wait('@getKey')
      cy.getTestId('key-form-tags').clear()
      cy.getTestId('key-form-tags').type('tag1,tag2')

      cy.get('@vueWrapper').then((wrapper: any) => wrapper.findComponent(EntityBaseForm)
        .vm.$emit('submit'))

      cy.wait('@updateKey')

      cy.get('@onUpdateSpy').should('have.been.calledOnce')
    })
  })
})