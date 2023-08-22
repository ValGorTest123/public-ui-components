// Cypress component test spec file
import type { ConsumerGroup } from '../../fixtures/mockData'
import {
  consumerGroups100,
  consumerGroups5,
  paginate,
} from '../../fixtures/mockData'
import type {
  KongManagerConsumerGroupListConfig,
  KonnectConsumerGroupListConfig,
} from '../types'
import { v4 as uuidv4 } from 'uuid'
import ConsumerGroupList from './ConsumerGroupList.vue'
import AddToGroupModal from './AddToGroupModal.vue'

describe('<ConsumerGroupList />', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', err => !err.message.includes('ResizeObserver loop limit exceeded'))
  })

  describe('Kong Manager', () => {
    const baseConfigKM: KongManagerConsumerGroupListConfig = {
      app: 'kongManager',
      workspace: 'default',
      apiBaseUrl: '/kong-manager',
      isExactMatch: false,
      filterSchema: {},
      createRoute: 'create-consumer-group',
      getViewRoute: () => 'view-consumer-group',
      getEditRoute: () => 'edit-consumer-group',
    }
    const configConsumerKM: KongManagerConsumerGroupListConfig = {
      app: 'kongManager',
      workspace: 'default',
      apiBaseUrl: '/kong-manager',
      isExactMatch: false,
      filterSchema: {},
      createRoute: 'create-consumer-group',
      getViewRoute: () => 'view-consumer-group',
      getEditRoute: () => 'edit-consumer-group',
      consumerId: '5921d16a-3e1d-4936-b21f-e5cae587415c',
      consumerUsername: 'Test Consumer',
    }

    const interceptKM = (params?: {
      mockData?: ConsumerGroup[];
      alias?: string;
    }) => {
      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKM.apiBaseUrl}/${baseConfigKM.workspace}/consumer_groups*`,
        },
        {
          statusCode: 200,
          body: {
            data: params?.mockData ?? [],
            total: params?.mockData?.length ?? 0,
          },
        },
      ).as(params?.alias ?? 'getConsumerGroups')
    }

    const interceptConsumerKM = (params?: {
      mockData?: ConsumerGroup[];
      alias?: string;
    }) => {
      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKM.apiBaseUrl}/${configConsumerKM.workspace}/consumers/${configConsumerKM.consumerId}/consumer_groups*`,
        },
        {
          statusCode: 200,
          body: {
            data: params?.mockData ?? [],
            total: params?.mockData?.length ?? 0,
          },
        },
      ).as(params?.alias ?? 'getGroups')
    }

    const interceptExitGroupKM = (params?: {
      status?: number;
      alias?: string;
    }) => {
      cy.intercept(
        {
          method: 'DELETE',
          url: `${baseConfigKM.apiBaseUrl}/${configConsumerKM.workspace}/consumers/${configConsumerKM.consumerId}/consumer_groups/*`,
        },
        {
          statusCode: params?.status || 200,
          body: {},
        },
      ).as(params?.alias ?? 'exitGroup')
    }

    const interceptKMMultiPage = (params?: {
      mockData?: ConsumerGroup[];
      alias?: string;
    }) => {
      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKM.apiBaseUrl}/${baseConfigKM.workspace}/consumer_groups*`,
        },
        (req) => {
          const size = req.query.size ? Number(req.query.size) : 30
          const offset = req.query.offset ? Number(req.query.offset) : 0

          req.reply({
            statusCode: 200,
            body: paginate(params?.mockData ?? [], size, offset),
          })
        },
      ).as(params?.alias ?? 'getConsumerGroupsMultiPage')
    }

    const triggerQuery = '.kong-ui-entities-consumer-groups-list tbody tr [data-testid="k-dropdown-trigger"]'
    const exitQuery = '.kong-ui-entities-consumer-groups-list tbody tr [data-testid="action-entity-delete"]'
    const modalQuery = 'exit-group-modal'

    it('should show empty state and create consumer group cta', () => {
      interceptKM()

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: baseConfigKM,
          canCreate: () => true,
          canEdit: () => {},
          canDelete: () => {},
          canRetrieve: () => {},
        },
      })

      cy.wait('@getConsumerGroups')
      cy.get('.kong-ui-entities-consumer-groups-list').should('be.visible')
      cy.get('.k-table-empty-state').should('be.visible')
      cy.get('[data-testid="new-consumer-group"]').should('be.visible')
    })

    it('should hide empty state and create consumer group cta if user can not create', () => {
      interceptKM()

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: baseConfigKM,
          canCreate: () => false,
          canEdit: () => {},
          canDelete: () => {},
          canRetrieve: () => {},
        },
      })

      cy.wait('@getConsumerGroups')
      cy.get('.kong-ui-entities-consumer-groups-list').should('be.visible')
      cy.get('.k-table-empty-state').should('be.visible')
      cy.get('[data-testid="new-consumer-group"]').should('not.exist')
    })

    it('should handle error state', () => {
      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKM.apiBaseUrl}/${baseConfigKM.workspace}/consumer_groups*`,
        },
        {
          statusCode: 500,
          body: {},
        },
      ).as('getConsumerGroups')

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: baseConfigKM,
          canCreate: () => {},
          canEdit: () => {},
          canDelete: () => {},
          canRetrieve: () => {},
        },
      })

      cy.wait('@getConsumerGroups')
      cy.get('.kong-ui-entities-consumer-groups-list').should('be.visible')
      cy.get('.k-table-error-state').should('be.visible')
    })

    it('should show consumer group items', () => {
      interceptKM({
        mockData: consumerGroups5,
      })

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: baseConfigKM,
          canCreate: () => {},
          canEdit: () => {},
          canDelete: () => {},
          canRetrieve: () => {},
        },
      })

      cy.wait('@getConsumerGroups')
      cy.get(
        '.kong-ui-entities-consumer-groups-list tr [data-testid="consumerGroup.1"]',
      ).should('exist')
      cy.get(
        '.kong-ui-entities-consumer-groups-list tr [data-testid="consumerGroup.2"]',
      ).should('exist')
    })

    it('should allow switching between pages', () => {
      interceptKMMultiPage({
        mockData: consumerGroups100,
      })

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: baseConfigKM,
          canCreate: () => {},
          canEdit: () => {},
          canDelete: () => {},
          canRetrieve: () => {},
        },
      })

      const l = '.kong-ui-entities-consumer-groups-list'
      const p = '[data-testid="k-table-pagination"]'

      cy.wait('@getConsumerGroupsMultiPage')

      // Page #1
      cy.get(`${l} tbody tr`).should('have.length', 30)
      cy.get(`${l} tbody tr [data-testid="consumerGroup.1"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.2"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.29"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.30"]`).should('exist')

      cy.get(`${l} ${p}`).should('exist')
      cy.get(`${l} ${p} [data-testid="prev-btn"]`).should(
        'have.class',
        'disabled',
      )
      cy.get(`${l} ${p} [data-testid="next-btn"]`)
        .should('not.have.class', 'disabled')
        .click() // next page

      cy.wait('@getConsumerGroupsMultiPage')

      // Page #2
      cy.get(`${l} tbody tr`).should('have.length', 30)
      cy.get(`${l} tbody tr [data-testid="consumerGroup.31"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.32"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.59"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.60"]`).should('exist')

      cy.get(`${l} ${p} [data-testid="prev-btn"]`).should(
        'not.have.class',
        'disabled',
      )
      cy.get(`${l} ${p} [data-testid="next-btn"]`)
        .should('not.have.class', 'disabled')
        .click() // next page

      cy.wait('@getConsumerGroupsMultiPage')

      cy.get(`${l} ${p} [data-testid="next-btn"]`)
        .should('not.have.class', 'disabled')
        .click() // next page

      // Page #4
      cy.get(`${l} tbody tr`).should('have.length', 10)
      cy.get(`${l} tbody tr [data-testid="consumerGroup.91"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.92"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.99"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.100"]`).should('exist')

      cy.get(`${l} ${p} [data-testid="prev-btn"]`).should(
        'not.have.class',
        'disabled',
      )
      cy.get(`${l} ${p} [data-testid="next-btn"]`).should(
        'have.class',
        'disabled',
      )
    })

    it('should allow picking different page sizes and persist the preference', () => {
      interceptKMMultiPage({
        mockData: consumerGroups100,
      })

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: baseConfigKM,
          canCreate: () => {},
          canEdit: () => {},
          canDelete: () => {},
          canRetrieve: () => {},
        },
      })
        .then(({ wrapper }) => wrapper)
        .as('vueWrapper')

      const l = '.kong-ui-entities-consumer-groups-list'
      const p = '[data-testid="k-table-pagination"]'

      cy.wait('@getConsumerGroupsMultiPage')

      cy.get(`${l} tbody tr`).should('have.length', 30)
      cy.get(`${l} tbody tr [data-testid="consumerGroup.1"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.2"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.29"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.30"]`).should('exist')

      cy.get(`${l} ${p} [data-testid="page-size-dropdown"]`).should(
        'contain.text',
        '30 items per page',
      )
      cy.get(`${l} ${p} [data-testid="page-size-dropdown"]`).click()
      cy.get(
        `${l} ${p} [data-testid="page-size-dropdown"] [value="15"]`,
      ).click()

      cy.wait('@getConsumerGroupsMultiPage')

      cy.get(`${l} tbody tr`).should('have.length', 15)
      cy.get(`${l} tbody tr [data-testid="consumerGroup.1"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.2"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.14"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.15"]`).should('exist')

      // Unmount and mount
      cy.get('@vueWrapper').then((wrapper: any) => wrapper.unmount())
      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: baseConfigKM,
          canCreate: () => {},
          canEdit: () => {},
          canDelete: () => {},
          canRetrieve: () => {},
        },
      })

      cy.wait('@getConsumerGroupsMultiPage')

      cy.get(`${l} tbody tr`).should('have.length', 15)
      cy.get(`${l} tbody tr [data-testid="consumerGroup.1"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.2"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.14"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.15"]`).should('exist')

      cy.get(`${l} ${p} [data-testid="page-size-dropdown"]`).should(
        'contain.text',
        '15 items per page',
      )
      cy.get(`${l} ${p} [data-testid="page-size-dropdown"]`).click()
      cy.get(
        `${l} ${p} [data-testid="page-size-dropdown"] [value="50"]`,
      ).click()

      cy.wait('@getConsumerGroupsMultiPage')

      cy.get(`${l} tbody tr`).should('have.length', 50)
      cy.get(`${l} tbody tr [data-testid="consumerGroup.1"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.2"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.49"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.50"]`).should('exist')

      cy.get(`${l} ${p} [data-testid="page-size-dropdown"]`).should(
        'contain.text',
        '50 items per page',
      )
    })

    it('should render correct Add to Group button when consumerId is provided', () => {
      interceptConsumerKM()

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: configConsumerKM,
          canCreate: () => true,
          canEdit: () => { },
          canDelete: () => { },
          canRetrieve: () => { },
        },
      })

      cy.wait('@getGroups')

      cy.getTestId('toolbar-add-consumer-group').should('exist')
      cy.getTestId('toolbar-add-consumer-group').should('contain.text', 'Add to Consumer Group')
    })

    it('should render AddToGroupModal onclick Add to Group button when consumerId is provided', () => {
      interceptConsumerKM()

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: configConsumerKM,
          canCreate: () => true,
          canEdit: () => { },
          canDelete: () => { },
          canRetrieve: () => { },
        },
      })

      cy.wait('@getGroups')

      cy.getTestId('toolbar-add-consumer-group').click()
      cy.getTestId('add-to-group-modal').should('exist')
    })

    it('should hide AddToGroupModal when modal emits cancel event', () => {
      interceptConsumerKM()

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: configConsumerKM,
          canCreate: () => true,
          canEdit: () => { },
          canDelete: () => { },
          canRetrieve: () => { },
        },
      }).then(({ wrapper }) => wrapper)
        .as('vueWrapper')

      cy.wait('@getGroups')

      cy.getTestId('toolbar-add-consumer-group').click()
      cy.getTestId('add-to-group-modal').should('exist')

      cy.get('@vueWrapper').then((wrapper: any) => wrapper.findComponent(AddToGroupModal).vm.$emit('cancel'))

      cy.getTestId('add-to-group-modal').should('not.exist')
    })

    it('should hide AddToGroupModal and emit add:success event when modal emits add:success event', () => {
      const expectedData = ['test 1', 'test 2']
      interceptConsumerKM()

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: configConsumerKM,
          canCreate: () => true,
          canEdit: () => { },
          canDelete: () => { },
          canRetrieve: () => { },
          'onAdd:success': cy.spy().as('addSuccess'),
        },
      }).then(({ wrapper }) => wrapper)
        .as('vueWrapper')

      cy.wait('@getGroups')

      cy.getTestId('toolbar-add-consumer-group').click()
      cy.getTestId('add-to-group-modal').should('exist')

      cy.get('@vueWrapper').then((wrapper: any) => wrapper.findComponent(AddToGroupModal).vm.$emit('add:success', expectedData))

      cy.get('@addSuccess').should('have.been.calledOnceWith', expectedData)
      cy.getTestId('add-to-group-modal').should('not.exist')
    })

    it('should not hide AddToGroupModal and emit add:success event when modal emits add:partial-success event',
      () => {
        const expectedData = ['test 1', 'test 2']
        interceptConsumerKM()

        cy.mount(ConsumerGroupList, {
          props: {
            cacheIdentifier: `consumer-group-list-${uuidv4()}`,
            config: configConsumerKM,
            canCreate: () => true,
            canEdit: () => { },
            canDelete: () => { },
            canRetrieve: () => { },
            'onAdd:success': cy.spy().as('addSuccess'),
          },
        }).then(({ wrapper }) => wrapper)
          .as('vueWrapper')

        cy.wait('@getGroups')

        cy.getTestId('toolbar-add-consumer-group').click()
        cy.getTestId('add-to-group-modal').should('exist')

        cy.get('@vueWrapper').then((wrapper: any) => wrapper.findComponent(AddToGroupModal)
          .vm.$emit('add:partial-success', expectedData))

        cy.get('@addSuccess').should('have.been.calledOnceWith', expectedData)
        cy.getTestId('add-to-group-modal').should('exist')
      })

    it('should render correct Exit item in action dropdown',
      () => {
        interceptConsumerKM({
          mockData: consumerGroups5,
        })

        cy.mount(ConsumerGroupList, {
          props: {
            cacheIdentifier: `consumer-group-list-${uuidv4()}`,
            config: configConsumerKM,
            canCreate: () => true,
            canEdit: () => { },
            canDelete: () => true,
            canRetrieve: () => { },
          },
        }).then(({ wrapper }) => wrapper)
          .as('vueWrapper')

        cy.wait('@getGroups')
        const popoverQuery = '.kong-ui-entities-consumer-groups-list tbody tr .k-popover'

        cy.get('.kong-ui-entities-consumer-groups-list').should('be.visible')
        cy.get(triggerQuery).should('be.visible')
        cy.get(triggerQuery).click()
        cy.get(popoverQuery).should('be.visible')
        cy.get(exitQuery).should('be.visible')
        cy.get(exitQuery).should('have.text', 'Exit')
      })

    it('should hide Exit Group modal when this modal emits canceled event',
      () => {
        interceptConsumerKM({
          mockData: consumerGroups5,
        })

        cy.mount(ConsumerGroupList, {
          props: {
            cacheIdentifier: `consumer-group-list-${uuidv4()}`,
            config: configConsumerKM,
            canCreate: () => true,
            canEdit: () => { },
            canDelete: () => true,
            canRetrieve: () => { },
          },
        }).then(({ wrapper }) => wrapper)
          .as('vueWrapper')

        cy.wait('@getGroups')

        cy.getTestId(modalQuery).should('not.exist')

        cy.get(triggerQuery).click()
        cy.get(exitQuery).should('be.visible').click()

        cy.getTestId(modalQuery).should('exist')

        cy.get('@vueWrapper').then((wrapper: any) => wrapper.getComponent(`[data-testid="${modalQuery}"]`)
          .vm.$emit('canceled'))

        cy.getTestId(modalQuery).should('not.exist')
      })

    it('should exit group and emit remove:success event when modal emits proceed event',
      () => {
        interceptConsumerKM({
          mockData: consumerGroups5,
        })
        interceptExitGroupKM()

        cy.mount(ConsumerGroupList, {
          props: {
            cacheIdentifier: `consumer-group-list-${uuidv4()}`,
            config: configConsumerKM,
            canCreate: () => true,
            canEdit: () => { },
            canDelete: () => true,
            canRetrieve: () => { },
            'onRemove:success': cy.spy().as('removeSuccess'),
          },
        }).then(({ wrapper }) => wrapper)
          .as('vueWrapper')

        cy.wait('@getGroups')

        cy.getTestId(modalQuery).should('not.exist')

        cy.get(triggerQuery).click()
        cy.get(exitQuery).should('be.visible').click()

        cy.getTestId(modalQuery).should('exist')

        cy.get('@vueWrapper').then((wrapper: any) => wrapper.getComponent(`[data-testid="${modalQuery}"]`)
          .vm.$emit('proceed'))

        cy.wait('@exitGroup')

        cy.get('@removeSuccess').should('have.been.called')

        cy.getTestId(modalQuery).should('not.exist')
      })

    it('should emit error event when exiting fails',
      () => {
        interceptConsumerKM({
          mockData: consumerGroups5,
        })
        interceptExitGroupKM({ status: 500 })

        cy.mount(ConsumerGroupList, {
          props: {
            cacheIdentifier: `consumer-group-list-${uuidv4()}`,
            config: configConsumerKM,
            canCreate: () => true,
            canEdit: () => { },
            canDelete: () => true,
            canRetrieve: () => { },
            onError: cy.spy().as('errorSpy'),
          },
        }).then(({ wrapper }) => wrapper)
          .as('vueWrapper')

        cy.wait('@getGroups')

        cy.getTestId(modalQuery).should('not.exist')

        cy.get(triggerQuery).click()
        cy.get(exitQuery).should('be.visible').click()

        cy.getTestId(modalQuery).should('exist')

        cy.get('@vueWrapper').then((wrapper: any) => wrapper.getComponent(`[data-testid="${modalQuery}"]`)
          .vm.$emit('proceed'))

        cy.wait('@exitGroup')

        cy.get('@errorSpy').should('have.been.called')

        cy.getTestId(modalQuery).should('exist')
      })
  })

  describe('Konnect', () => {
    const baseConfigKonnect: KonnectConsumerGroupListConfig = {
      app: 'konnect',
      controlPlaneId: '1234-abcd-ilove-cats',
      apiBaseUrl: '/us/kong-api/konnect-api',
      createRoute: 'create-consumer-group',
      getViewRoute: () => 'view-consumer-group',
      getEditRoute: () => 'edit-consumer-group',
    }
    const configConsumerKonnect: KonnectConsumerGroupListConfig = {
      app: 'konnect',
      controlPlaneId: '1234-abcd-ilove-cats',
      apiBaseUrl: '/us/kong-api/konnect-api',
      createRoute: 'create-consumer-group',
      getViewRoute: () => 'view-consumer-group',
      getEditRoute: () => 'edit-consumer-group',
      consumerId: '5921d16a-3e1d-4936-b21f-e5cae587415c',
      consumerUsername: 'Test Consumer',
    }

    const interceptKonnect = (params?: {
      mockData?: ConsumerGroup[];
      alias?: string;
    }) => {
      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKonnect.apiBaseUrl}/api/runtime_groups/${baseConfigKonnect.controlPlaneId}/consumer_groups*`,
        },
        {
          statusCode: 200,
          body: {
            data: params?.mockData ?? [],
            total: params?.mockData?.length ?? 0,
          },
        },
      ).as(params?.alias ?? 'getConsumerGroups')
    }
    const interceptConsumerKonnect = (params?: {
      mockData?: ConsumerGroup[];
      alias?: string;
    }) => {
      cy.intercept(
        {
          method: 'GET',
          url: `${configConsumerKonnect.apiBaseUrl}/api/runtime_groups/${configConsumerKonnect.controlPlaneId}/consumers/${configConsumerKonnect.consumerId}/consumer_groups*`,
        },
        {
          statusCode: 200,
          body: {
            data: params?.mockData ?? [],
            total: params?.mockData?.length ?? 0,
          },
        },
      ).as(params?.alias ?? 'getGroups')
    }
    const interceptExitGroupKonnect = (params?: {
      status?: number;
      alias?: string;
    }) => {
      cy.intercept(
        {
          method: 'DELETE',
          url: `${configConsumerKonnect.apiBaseUrl}/api/runtime_groups/${configConsumerKonnect.controlPlaneId}/consumers/${configConsumerKonnect.consumerId}/consumer_groups/*`,
        },
        {
          statusCode: params?.status || 200,
          body: {},
        },
      ).as(params?.alias ?? 'exitGroup')
    }

    const interceptKonnectMultiPage = (params?: {
      mockData?: ConsumerGroup[];
      alias?: string;
    }) => {
      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKonnect.apiBaseUrl}/api/runtime_groups/${baseConfigKonnect.controlPlaneId}/consumer_groups*`,
        },
        (req) => {
          const size = req.query.size ? Number(req.query.size) : 30
          const offset = req.query.offset ? Number(req.query.offset) : 0

          req.reply({
            statusCode: 200,
            body: paginate(params?.mockData ?? [], size, offset),
          })
        },
      ).as(params?.alias ?? 'getConsumerGroupsMultiPage')
    }

    const triggerQuery = '.kong-ui-entities-consumer-groups-list tbody tr [data-testid="k-dropdown-trigger"]'
    const exitQuery = '.kong-ui-entities-consumer-groups-list tbody tr [data-testid="action-entity-delete"]'
    const modalQuery = 'exit-group-modal'

    it('should show empty state and create consumer group cta', () => {
      interceptKonnect()

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: baseConfigKonnect,
          canCreate: () => true,
          canEdit: () => {},
          canDelete: () => {},
          canRetrieve: () => {},
        },
      })

      cy.wait('@getConsumerGroups')
      cy.get('.kong-ui-entities-consumer-groups-list').should('be.visible')
      cy.get('.k-table-empty-state').should('be.visible')
      cy.get('[data-testid="new-consumer-group"]').should('be.visible')
    })

    it('should hide empty state and create consumer group cta if user can not create', () => {
      interceptKonnect()

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: baseConfigKonnect,
          canCreate: () => false,
          canEdit: () => {},
          canDelete: () => {},
          canRetrieve: () => {},
        },
      })

      cy.wait('@getConsumerGroups')
      cy.get('.kong-ui-entities-consumer-groups-list').should('be.visible')
      cy.get('.k-table-empty-state').should('be.visible')
      cy.get('[data-testid="new-consumer-group"]').should('not.exist')
    })

    it('should handle error state', () => {
      cy.intercept(
        {
          method: 'GET',
          url: `${baseConfigKonnect.apiBaseUrl}/api/runtime_groups/${baseConfigKonnect.controlPlaneId}/consumer_groups*`,
        },
        {
          statusCode: 500,
          body: {},
        },
      ).as('getConsumerGroups')

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: baseConfigKonnect,
          canCreate: () => {},
          canEdit: () => {},
          canDelete: () => {},
          canRetrieve: () => {},
        },
      })

      cy.wait('@getConsumerGroups')
      cy.get('.kong-ui-entities-consumer-groups-list').should('be.visible')
      cy.get('.k-table-error-state').should('be.visible')
    })

    it('should show consumer group items', () => {
      interceptKonnect({
        mockData: consumerGroups5,
      })

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: baseConfigKonnect,
          canCreate: () => {},
          canEdit: () => {},
          canDelete: () => {},
          canRetrieve: () => {},
        },
      })

      cy.wait('@getConsumerGroups')
      cy.get(
        '.kong-ui-entities-consumer-groups-list tr [data-testid="consumerGroup.1"]',
      ).should('exist')
      cy.get(
        '.kong-ui-entities-consumer-groups-list tr [data-testid="consumerGroup.2"]',
      ).should('exist')
    })

    it('should allow switching between pages', () => {
      interceptKonnectMultiPage({
        mockData: consumerGroups100,
      })

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: baseConfigKonnect,
          canCreate: () => {},
          canEdit: () => {},
          canDelete: () => {},
          canRetrieve: () => {},
        },
      })

      const l = '.kong-ui-entities-consumer-groups-list'
      const p = '[data-testid="k-table-pagination"]'

      cy.wait('@getConsumerGroupsMultiPage')

      // Page #1
      cy.get(`${l} tbody tr`).should('have.length', 30)
      cy.get(`${l} tbody tr [data-testid="consumerGroup.1"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.2"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.29"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.30"]`).should('exist')

      cy.get(`${l} ${p}`).should('exist')
      cy.get(`${l} ${p} [data-testid="prev-btn"]`).should(
        'have.class',
        'disabled',
      )
      cy.get(`${l} ${p} [data-testid="next-btn"]`)
        .should('not.have.class', 'disabled')
        .click() // next page

      cy.wait('@getConsumerGroupsMultiPage')

      // Page #2
      cy.get(`${l} tbody tr`).should('have.length', 30)
      cy.get(`${l} tbody tr [data-testid="consumerGroup.31"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.32"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.59"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.60"]`).should('exist')

      cy.get(`${l} ${p} [data-testid="prev-btn"]`).should(
        'not.have.class',
        'disabled',
      )
      cy.get(`${l} ${p} [data-testid="next-btn"]`)
        .should('not.have.class', 'disabled')
        .click() // next page

      cy.wait('@getConsumerGroupsMultiPage')

      cy.get(`${l} ${p} [data-testid="next-btn"]`)
        .should('not.have.class', 'disabled')
        .click() // next page

      // Page #4
      cy.get(`${l} tbody tr`).should('have.length', 10)
      cy.get(`${l} tbody tr [data-testid="consumerGroup.91"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.92"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.99"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.100"]`).should('exist')

      cy.get(`${l} ${p} [data-testid="prev-btn"]`).should(
        'not.have.class',
        'disabled',
      )
      cy.get(`${l} ${p} [data-testid="next-btn"]`).should(
        'have.class',
        'disabled',
      )
    })

    it('should allow picking different page sizes and persist the preference', () => {
      interceptKonnectMultiPage({
        mockData: consumerGroups100,
      })

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: baseConfigKonnect,
          canCreate: () => {},
          canEdit: () => {},
          canDelete: () => {},
          canRetrieve: () => {},
        },
      })
        .then(({ wrapper }) => wrapper)
        .as('vueWrapper')

      const l = '.kong-ui-entities-consumer-groups-list'
      const p = '[data-testid="k-table-pagination"]'

      cy.wait('@getConsumerGroupsMultiPage')

      cy.get(`${l} tbody tr`).should('have.length', 30)
      cy.get(`${l} tbody tr [data-testid="consumerGroup.1"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.2"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.29"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.30"]`).should('exist')

      cy.get(`${l} ${p} [data-testid="page-size-dropdown"]`).should(
        'contain.text',
        '30 items per page',
      )
      cy.get(`${l} ${p} [data-testid="page-size-dropdown"]`).click()
      cy.get(
        `${l} ${p} [data-testid="page-size-dropdown"] [value="15"]`,
      ).click()

      cy.wait('@getConsumerGroupsMultiPage')

      cy.get(`${l} tbody tr`).should('have.length', 15)
      cy.get(`${l} tbody tr [data-testid="consumerGroup.1"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.2"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.14"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.15"]`).should('exist')

      // Unmount and mount
      cy.get('@vueWrapper').then((wrapper: any) => wrapper.unmount())
      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: baseConfigKonnect,
          canCreate: () => {},
          canEdit: () => {},
          canDelete: () => {},
          canRetrieve: () => {},
        },
      })

      cy.wait('@getConsumerGroupsMultiPage')

      cy.get(`${l} tbody tr`).should('have.length', 15)
      cy.get(`${l} tbody tr [data-testid="consumerGroup.1"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.2"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.14"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.15"]`).should('exist')

      cy.get(`${l} ${p} [data-testid="page-size-dropdown"]`).should(
        'contain.text',
        '15 items per page',
      )
      cy.get(`${l} ${p} [data-testid="page-size-dropdown"]`).click()
      cy.get(
        `${l} ${p} [data-testid="page-size-dropdown"] [value="50"]`,
      ).click()

      cy.wait('@getConsumerGroupsMultiPage')

      cy.get(`${l} tbody tr`).should('have.length', 50)
      cy.get(`${l} tbody tr [data-testid="consumerGroup.1"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.2"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.49"]`).should('exist')
      cy.get(`${l} tbody tr [data-testid="consumerGroup.50"]`).should('exist')

      cy.get(`${l} ${p} [data-testid="page-size-dropdown"]`).should(
        'contain.text',
        '50 items per page',
      )
    })

    it('should render correct Add to Group button when consumerId is provided', () => {
      interceptConsumerKonnect()

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: configConsumerKonnect,
          canCreate: () => true,
          canEdit: () => { },
          canDelete: () => { },
          canRetrieve: () => { },
        },
      })

      cy.wait('@getGroups')

      cy.getTestId('toolbar-add-consumer-group').should('exist')
      cy.getTestId('toolbar-add-consumer-group').should('contain.text', 'Add to Consumer Group')
    })

    it('should render AddToGroupModal onclick Add to Group button when consumerId is provided', () => {
      interceptConsumerKonnect()

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: configConsumerKonnect,
          canCreate: () => true,
          canEdit: () => { },
          canDelete: () => { },
          canRetrieve: () => { },
        },
      })

      cy.wait('@getGroups')

      cy.getTestId('toolbar-add-consumer-group').click()
      cy.getTestId('add-to-group-modal').should('exist')
    })

    it('should hide AddToGroupModal when modal emits cancel event', () => {
      interceptConsumerKonnect()

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: configConsumerKonnect,
          canCreate: () => true,
          canEdit: () => { },
          canDelete: () => { },
          canRetrieve: () => { },
        },
      }).then(({ wrapper }) => wrapper)
        .as('vueWrapper')

      cy.wait('@getGroups')

      cy.getTestId('toolbar-add-consumer-group').click()
      cy.getTestId('add-to-group-modal').should('exist')

      cy.get('@vueWrapper').then((wrapper: any) => wrapper.findComponent(AddToGroupModal).vm.$emit('cancel'))

      cy.getTestId('add-to-group-modal').should('not.exist')
    })

    it('should hide AddToGroupModal and emit add:success event when modal emits add:success event', () => {
      const expectedData = ['test 1', 'test 2']
      interceptConsumerKonnect()

      cy.mount(ConsumerGroupList, {
        props: {
          cacheIdentifier: `consumer-group-list-${uuidv4()}`,
          config: configConsumerKonnect,
          canCreate: () => true,
          canEdit: () => { },
          canDelete: () => { },
          canRetrieve: () => { },
          'onAdd:success': cy.spy().as('addSuccess'),
        },
      }).then(({ wrapper }) => wrapper)
        .as('vueWrapper')

      cy.wait('@getGroups')

      cy.getTestId('toolbar-add-consumer-group').click()
      cy.getTestId('add-to-group-modal').should('exist')

      cy.get('@vueWrapper').then((wrapper: any) => wrapper.findComponent(AddToGroupModal).vm.$emit('add:success', expectedData))

      cy.get('@addSuccess').should('have.been.calledOnceWith', expectedData)
      cy.getTestId('add-to-group-modal').should('not.exist')
    })

    it('should not hide AddToGroupModal and emit add:success event when modal emits add:partial-success event',
      () => {
        const expectedData = ['test 1', 'test 2']
        interceptConsumerKonnect()

        cy.mount(ConsumerGroupList, {
          props: {
            cacheIdentifier: `consumer-group-list-${uuidv4()}`,
            config: configConsumerKonnect,
            canCreate: () => true,
            canEdit: () => { },
            canDelete: () => { },
            canRetrieve: () => { },
            'onAdd:success': cy.spy().as('addSuccess'),
          },
        }).then(({ wrapper }) => wrapper)
          .as('vueWrapper')

        cy.wait('@getGroups')

        cy.getTestId('toolbar-add-consumer-group').click()
        cy.getTestId('add-to-group-modal').should('exist')

        cy.get('@vueWrapper').then((wrapper: any) => wrapper.findComponent(AddToGroupModal)
          .vm.$emit('add:partial-success', expectedData))

        cy.get('@addSuccess').should('have.been.calledOnceWith', expectedData)
        cy.getTestId('add-to-group-modal').should('exist')
      })

    it('should render correct Exit item in action dropdown',
      () => {
        interceptConsumerKonnect({
          mockData: consumerGroups5,
        })

        cy.mount(ConsumerGroupList, {
          props: {
            cacheIdentifier: `consumer-group-list-${uuidv4()}`,
            config: configConsumerKonnect,
            canCreate: () => true,
            canEdit: () => { },
            canDelete: () => true,
            canRetrieve: () => { },
          },
        }).then(({ wrapper }) => wrapper)
          .as('vueWrapper')

        cy.wait('@getGroups')
        const popoverQuery = '.kong-ui-entities-consumer-groups-list tbody tr .k-popover'

        cy.get('.kong-ui-entities-consumer-groups-list').should('be.visible')
        cy.get(triggerQuery).should('be.visible')
        cy.get(triggerQuery).click()
        cy.get(popoverQuery).should('be.visible')
        cy.get(exitQuery).should('be.visible')
        cy.get(exitQuery).should('have.text', 'Exit')
      })

    it('should hide Exit Group modal when this modal emits canceled event',
      () => {
        interceptConsumerKonnect({
          mockData: consumerGroups5,
        })

        cy.mount(ConsumerGroupList, {
          props: {
            cacheIdentifier: `consumer-group-list-${uuidv4()}`,
            config: configConsumerKonnect,
            canCreate: () => true,
            canEdit: () => { },
            canDelete: () => true,
            canRetrieve: () => { },
          },
        }).then(({ wrapper }) => wrapper)
          .as('vueWrapper')

        cy.wait('@getGroups')

        cy.getTestId(modalQuery).should('not.exist')

        cy.get(triggerQuery).click()
        cy.get(exitQuery).should('be.visible').click()

        cy.getTestId(modalQuery).should('exist')

        cy.get('@vueWrapper').then((wrapper: any) => wrapper.getComponent(`[data-testid="${modalQuery}"]`)
          .vm.$emit('canceled'))

        cy.getTestId(modalQuery).should('not.exist')
      })

    it('should exit group and emit remove:success event when modal emits proceed event',
      () => {
        interceptConsumerKonnect({
          mockData: consumerGroups5,
        })
        interceptExitGroupKonnect()

        cy.mount(ConsumerGroupList, {
          props: {
            cacheIdentifier: `consumer-group-list-${uuidv4()}`,
            config: configConsumerKonnect,
            canCreate: () => true,
            canEdit: () => { },
            canDelete: () => true,
            canRetrieve: () => { },
            'onRemove:success': cy.spy().as('removeSuccess'),
          },
        }).then(({ wrapper }) => wrapper)
          .as('vueWrapper')

        cy.wait('@getGroups')

        cy.getTestId(modalQuery).should('not.exist')

        cy.get(triggerQuery).click()
        cy.get(exitQuery).should('be.visible').click()

        cy.getTestId(modalQuery).should('exist')

        cy.get('@vueWrapper').then((wrapper: any) => wrapper.getComponent(`[data-testid="${modalQuery}"]`)
          .vm.$emit('proceed'))

        cy.wait('@exitGroup')

        cy.get('@removeSuccess').should('have.been.called')

        cy.getTestId(modalQuery).should('not.exist')
      })

    it('should emit error event when exiting fails',
      () => {
        interceptConsumerKonnect({
          mockData: consumerGroups5,
        })
        interceptExitGroupKonnect({ status: 500 })

        cy.mount(ConsumerGroupList, {
          props: {
            cacheIdentifier: `consumer-group-list-${uuidv4()}`,
            config: configConsumerKonnect,
            canCreate: () => true,
            canEdit: () => { },
            canDelete: () => true,
            canRetrieve: () => { },
            onError: cy.spy().as('errorSpy'),
          },
        }).then(({ wrapper }) => wrapper)
          .as('vueWrapper')

        cy.wait('@getGroups')

        cy.getTestId(modalQuery).should('not.exist')

        cy.get(triggerQuery).click()
        cy.get(exitQuery).should('be.visible').click()

        cy.getTestId(modalQuery).should('exist')

        cy.get('@vueWrapper').then((wrapper: any) => wrapper.getComponent(`[data-testid="${modalQuery}"]`)
          .vm.$emit('proceed'))

        cy.wait('@exitGroup')

        cy.get('@errorSpy').should('have.been.called')

        cy.getTestId(modalQuery).should('exist')
      })
  })
})
