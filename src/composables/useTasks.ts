import { computed, type Ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  getTenantTasks,
  updateTenantTask,
  getControlTasks,
  getTenantTask,
  type UpdateTenantTaskInput,
  type TenantTasksResponse,
} from '@/api/tasks'
import { useOrganizationStore } from '@/stores/organization'

export const taskKeys = {
  all: ['tasks'] as const,
  list: (tenantId: string, limit: number, offset: number, status?: string, search?: string) =>
    [...taskKeys.all, tenantId, { limit, offset, status, search }] as const,
  controlList: (
    tenantId: string,
    controlId: string,
    limit: number,
    offset: number,
    status?: string,
    search?: string,
  ) =>
    [...taskKeys.all, tenantId, 'control', controlId, { limit, offset, status, search }] as const,
}

export function useControlTasksQuery(
  controlId: Ref<string> | string,
  limit: Ref<number> | number,
  offset: Ref<number> | number,
  status?: Ref<string | undefined> | string,
  search?: Ref<string | undefined> | string,
) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  const controlIdVal = computed(() => {
    return typeof controlId === 'string' ? controlId : controlId.value
  })

  const limitVal = computed(() => {
    return typeof limit === 'number' ? limit : limit.value
  })

  const offsetVal = computed(() => {
    return typeof offset === 'number' ? offset : offset.value
  })

  const statusVal = computed(() => {
    if (!status) return undefined
    return typeof status === 'string' ? status : status.value
  })

  const searchVal = computed(() => {
    if (!search) return undefined
    return typeof search === 'string' ? search : search.value
  })

  return useQuery({
    queryKey: computed(() => {
      const tId = tenantId.value || ''
      const cId = controlIdVal.value || ''
      return taskKeys.controlList(
        tId,
        cId,
        limitVal.value,
        offsetVal.value,
        statusVal.value,
        searchVal.value,
      )
    }),
    queryFn: () =>
      getControlTasks(tenantId.value!, controlIdVal.value, {
        limit: limitVal.value,
        offset: offsetVal.value,
        total: true,
        status: statusVal.value,
        search: searchVal.value,
      }),
    enabled: computed(() => !!tenantId.value && !!controlIdVal.value),
    staleTime: 300_000,
  })
}

export function useTenantTasksQuery(
  limit: Ref<number> | number,
  offset: Ref<number> | number,
  status?: Ref<string | undefined> | string,
  search?: Ref<string | undefined> | string,
) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  const limitVal = computed(() => {
    return typeof limit === 'number' ? limit : limit.value
  })

  const offsetVal = computed(() => {
    return typeof offset === 'number' ? offset : offset.value
  })

  const statusVal = computed(() => {
    if (!status) return undefined
    return typeof status === 'string' ? status : status.value
  })

  const searchVal = computed(() => {
    if (!search) return undefined
    return typeof search === 'string' ? search : search.value
  })

  return useQuery({
    queryKey: computed(() => {
      const tId = tenantId.value || ''
      return taskKeys.list(tId, limitVal.value, offsetVal.value, statusVal.value, searchVal.value)
    }),
    queryFn: () =>
      getTenantTasks(tenantId.value!, {
        limit: limitVal.value,
        offset: offsetVal.value,
        total: true,
        status: statusVal.value,
        search: searchVal.value,
      }),
    enabled: computed(() => !!tenantId.value),
  })
}

export function useTenantTaskQuery(taskId: Ref<string> | string) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)
  const taskIdVal = computed(() => {
    return typeof taskId === 'string' ? taskId : taskId.value
  })

  return useQuery({
    queryKey: computed(() => ['tasks', tenantId.value || '', 'detail', taskIdVal.value]),
    queryFn: async () => {
      try {
        return await getTenantTask(tenantId.value!, taskIdVal.value)
      } catch (err) {
        // Fallback: fetch tasks list and find the task by ID
        const response = await getTenantTasks(tenantId.value!, { limit: 100 })
        const found = response.tenantTasks?.find((t) => t.$id === taskIdVal.value)
        if (found) return found
        throw err
      }
    },
    enabled: computed(() => !!tenantId.value && !!taskIdVal.value),
  })
}

export function useTasksQuery(
  controlId: Ref<string | undefined> | string | undefined,
  limit: Ref<number> | number,
  offset: Ref<number> | number,
  status?: Ref<string | undefined> | string,
  search?: Ref<string | undefined> | string,
) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  const controlIdVal = computed(() => {
    if (!controlId) return undefined
    return typeof controlId === 'string' ? controlId : controlId.value
  })

  const limitVal = computed(() => {
    return typeof limit === 'number' ? limit : limit.value
  })

  const offsetVal = computed(() => {
    return typeof offset === 'number' ? offset : offset.value
  })

  const statusVal = computed(() => {
    if (!status) return undefined
    return typeof status === 'string' ? status : status.value
  })

  const searchVal = computed(() => {
    if (!search) return undefined
    return typeof search === 'string' ? search : search.value
  })

  return useQuery({
    queryKey: computed(() => {
      const tId = tenantId.value || ''
      const cId = controlIdVal.value
      if (cId) {
        return taskKeys.controlList(
          tId,
          cId,
          limitVal.value,
          offsetVal.value,
          statusVal.value,
          searchVal.value,
        )
      }
      return taskKeys.list(tId, limitVal.value, offsetVal.value, statusVal.value, searchVal.value)
    }),
    queryFn: () => {
      const tId = tenantId.value!
      const cId = controlIdVal.value
      if (cId) {
        return getControlTasks(tId, cId, {
          limit: limitVal.value,
          offset: offsetVal.value,
          total: true,
          status: statusVal.value,
          search: searchVal.value,
        })
      }
      return getTenantTasks(tId, {
        limit: limitVal.value,
        offset: offsetVal.value,
        total: true,
        status: statusVal.value,
        search: searchVal.value,
      })
    },
    enabled: computed(() => !!tenantId.value),
    staleTime: 300_000,
  })
}

export function useUpdateTenantTaskMutation() {
  const queryClient = useQueryClient()
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: UpdateTenantTaskInput }) =>
      updateTenantTask(tenantId.value!, taskId, updates),
    onMutate: async ({ taskId, updates }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: taskKeys.all })

      // Snapshot the previous values
      const previousQueriesData = new Map<string, unknown>()

      // We need to optimistically update all query caches matching 'tasks'
      const cacheQueries = queryClient.getQueryCache().findAll({ queryKey: taskKeys.all })
      for (const query of cacheQueries) {
        const queryKey = query.queryKey
        const previousData = queryClient.getQueryData<TenantTasksResponse>(queryKey)
        if (previousData && previousData.tenantTasks) {
          previousQueriesData.set(JSON.stringify(queryKey), previousData)

          const updatedTasks = previousData.tenantTasks.map((t) => {
            if (t.$id === taskId) {
              return {
                ...t,
                ...updates,
              }
            }
            return t
          })

          queryClient.setQueryData(queryKey, {
            ...previousData,
            tenantTasks: updatedTasks,
          })
        }
      }

      return { previousQueriesData }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueriesData) {
        for (const [keyStr, prevData] of context.previousQueriesData.entries()) {
          queryClient.setQueryData(JSON.parse(keyStr), prevData)
        }
      }
    },
    onSuccess: (updatedTask) => {
      const cacheQueries = queryClient.getQueryCache().findAll({ queryKey: taskKeys.all })
      for (const query of cacheQueries) {
        const queryKey = query.queryKey
        const previousData = queryClient.getQueryData<TenantTasksResponse>(queryKey)
        if (previousData && previousData.tenantTasks) {
          const updatedTasks = previousData.tenantTasks.map((t) => {
            if (t.$id === updatedTask.$id) {
              return updatedTask
            }
            return t
          })

          queryClient.setQueryData(queryKey, {
            ...previousData,
            tenantTasks: updatedTasks,
          })
        }
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}
