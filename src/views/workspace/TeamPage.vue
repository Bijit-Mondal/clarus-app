<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  PhCalendar,
  PhCheckCircle,
  PhPencilSimple,
  PhUserPlus,
  PhUsers,
  PhWarning,
  PhX,
} from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTenantUsersQuery } from '@/composables/useTenants'
import {
  useCreateMembershipMutation,
  useMembershipsQuery,
  useRevokeMembershipMutation,
  useUpdateMembershipRoleMutation,
} from '@/composables/useMemberships'

// Define Membership User Type for local UI list
interface MembershipUser {
  id: string
  name: string
  role: 'owner' | 'admin' | 'auditor' | 'employee' | 'contractor'
  status: 'active' | 'revoked'
  createdAt: string
  isCurrentUser?: boolean
}

const { data: tenantUsersData, isPending: isUsersPending } = useTenantUsersQuery()
const { data: membershipsData, isPending: isMembershipsPending } = useMembershipsQuery()
const createMembershipMutation = useCreateMembershipMutation()
const revokeMembershipMutation = useRevokeMembershipMutation()
const updateMembershipRoleMutation = useUpdateMembershipRoleMutation()
const isQueryPending = computed(() => isUsersPending.value || isMembershipsPending.value)


const members = computed<MembershipUser[]>(() => {
  const users = tenantUsersData.value?.users || []
  const memberships = membershipsData.value?.memberships || []

  return memberships.map((membership) => {
    const user = users.find((u) => u.$id === membership.userId)
    const name = user ? user.name : `User (${membership.userId})`
    const isCurrentUser = name === 'Alex Rivera' || membership.$id === 'mem_1'
    return {
      id: membership.$id,
      name,
      role: (membership.role || 'employee') as MembershipUser['role'],
      status: (membership.status || 'active') as MembershipUser['status'],
      createdAt: membership.$createdAt || '2026-07-15T00:00:00Z',
      isCurrentUser,
    }
  })
})

// Dialog state
const isDialogOpen = ref(false)
const formEmail = ref('')
const formRole = ref<'admin' | 'auditor' | 'employee' | 'contractor'>('employee')
const isAdding = computed(() => createMembershipMutation.isPending.value)
const addSuccess = ref(false)
const addError = ref('')
const updatingRoleId = ref<string | null>(null)
const revokingMemberId = ref<string | null>(null)
const editingRoleId = ref<string | null>(null)

// Helpers
const getRoleLabel = (role: string) => {
  switch (role) {
    case 'owner':
      return 'Owner'
    case 'admin':
      return 'Compliance Admin'
    case 'auditor':
      return 'External Auditor'
    case 'employee':
      return 'Employee'
    case 'contractor':
      return 'Contractor'
    default:
      return role
  }
}

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'owner':
      return 'bg-primary/10 text-primary border-transparent'
    case 'admin':
      return 'bg-info/10 text-info-foreground dark:text-info border-transparent'
    case 'auditor':
      return 'bg-muted text-muted-foreground border-border'
    case 'employee':
      return 'bg-secondary text-secondary-foreground border-transparent'
    case 'contractor':
      return 'bg-warning/10 text-warning-emphasis border-transparent'
    default:
      return 'bg-secondary text-secondary-foreground border-transparent'
  }
}

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    const first = parts[0]
    return first ? first.slice(0, 2).toUpperCase() : '?'
  }
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase()
}

const formatDate = (isoString: string) => {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Actions
const openAddMemberDialog = () => {
  formEmail.value = ''
  formRole.value = 'employee'
  addError.value = ''
  addSuccess.value = false
  isDialogOpen.value = true
}

const handleAddMember = async () => {
  if (!formEmail.value || !formRole.value) return

  addError.value = ''

  try {
    await createMembershipMutation.mutateAsync({
      email: formEmail.value,
      role: formRole.value,
    })

    addSuccess.value = true
    setTimeout(() => {
      isDialogOpen.value = false
    }, 500)
  } catch (error) {
    console.warn('API call failed:', error)
    addError.value = 'Failed to add member. Please try again.'
  }
}

const handleRevoke = async (memberId: string) => {
  revokingMemberId.value = memberId
  try {
    await revokeMembershipMutation.mutateAsync(memberId)
  } catch (error) {
    console.warn('Revoke API call failed', error)
  } finally {
    revokingMemberId.value = null
  }
}

const handleRoleChange = async (memberId: string, newRole: 'admin' | 'auditor' | 'employee' | 'contractor') => {
  updatingRoleId.value = memberId
  editingRoleId.value = null
  try {
    await updateMembershipRoleMutation.mutateAsync({
      membershipId: memberId,
      role: newRole,
    })
  } catch (error) {
    console.warn('Role update API call failed', error)
  } finally {
    updatingRoleId.value = null
  }
}
</script>

<template>
  <article class="space-y-6">
    <!-- Page Header with invite/add member action -->
    <PageHeader>
      <template #actions>
        <Button @click="openAddMemberDialog" class="font-medium">
          <PhUserPlus :size="16" class="mr-1.5" />
          Add Member
        </Button>
      </template>
    </PageHeader>

    <!-- Overview Banner -->
    <div class="rounded-lg border border-border bg-card p-6 shadow-2xs flex items-center gap-4">
      <div class="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <PhUsers :size="24" weight="fill" />
      </div>
      <div>
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tenant Members</p>
        <h3 class="text-2xl font-bold text-foreground">{{ members.length }} Total</h3>
      </div>
    </div>

    <!-- Members Table Surface -->
    <div class="rounded-lg border border-border bg-card shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-border bg-muted/40">
              <th class="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/3">User</th>
              <th class="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tenant Role</th>
              <th class="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th class="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined Date</th>
              <th class="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <!-- Skeleton Rows -->
            <tr v-if="isQueryPending && members.length === 0">
              <td colspan="5" class="p-0">
                <ClarusLoadingState variant="table-rows" :rows="3" label="Loading team members" />
              </td>
            </tr>

            <tr v-for="member in members" :key="member.id" class="hover:bg-muted/10 transition-colors">
              <!-- Name & Email -->
              <td class="p-4 flex items-center gap-3">
                <Avatar class="size-9 border border-border">
                  <AvatarFallback class="bg-secondary text-xs font-semibold text-secondary-foreground">
                    {{ getInitials(member.name) }}
                  </AvatarFallback>
                </Avatar>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm font-semibold text-foreground truncate capitalize">{{ member.name }}</span>
                    <Badge v-if="member.isCurrentUser" class="bg-primary/10 text-primary text-[9px] px-1.5 py-0 border-transparent font-medium">
                      You
                    </Badge>
                  </div>
                </div>
              </td>

              <!-- Role Selector / Static Badge -->
              <td class="p-4">
                <div v-if="member.isCurrentUser || member.role === 'owner'" class="inline-block">
                  <Badge :class="['text-xs font-medium px-2.5 py-0.5 border', getRoleBadgeClass(member.role)]">
                    {{ getRoleLabel(member.role) }}
                  </Badge>
                </div>
                <div v-else-if="updatingRoleId === member.id" class="flex items-center gap-2 text-xs text-muted-foreground">
                  <div class="size-3.5 animate-spin rounded-full border border-primary border-t-transparent" aria-hidden="true" />
                  <span>Updating...</span>
                </div>
                <div v-else-if="editingRoleId === member.id" class="flex items-center gap-1.5">
                  <Select
                    :model-value="member.role"
                    @update:model-value="(newRole) => handleRoleChange(member.id, newRole as any)"
                  >
                    <SelectTrigger
                      class="h-7 w-[130px] bg-background text-xs focus:ring-1 focus:ring-primary border-border hover:bg-accent/60 cursor-pointer transition-colors"
                      :aria-label="'Change role for ' + member.name"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Compliance Admin</SelectItem>
                      <SelectItem value="auditor">External Auditor</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    class="h-7 w-7 p-0 hover:bg-muted"
                    @click="editingRoleId = null"
                    aria-label="Cancel edit"
                  >
                    <PhX :size="13" class="text-muted-foreground" />
                  </Button>
                </div>
                <div v-else class="flex items-center gap-2 group/role">
                  <Badge :class="['text-xs font-medium px-2.5 py-0.5 border', getRoleBadgeClass(member.role)]">
                    {{ getRoleLabel(member.role) }}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    class="h-6 w-6 p-0 opacity-0 group-hover/role:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-muted"
                    @click="editingRoleId = member.id"
                    aria-label="Edit role"
                  >
                    <PhPencilSimple :size="12" class="text-muted-foreground hover:text-foreground" />
                  </Button>
                </div>
              </td>

              <!-- Status -->
              <td class="p-4">
                <div class="flex items-center gap-1.5">
                  <span
                    class="size-2 rounded-full"
                    :class="[member.status === 'active' ? 'bg-primary' : 'bg-destructive']"
                  />
                  <span class="text-xs font-medium capitalize" :class="[member.status === 'active' ? 'text-foreground' : 'text-muted-foreground']">
                    {{ member.status }}
                  </span>
                </div>
              </td>

              <!-- Joined Date -->
              <td class="p-4">
                <span class="text-xs text-muted-foreground flex items-center gap-1">
                  <PhCalendar :size="13" />
                  {{ formatDate(member.createdAt) }}
                </span>
              </td>

              <!-- Actions -->
              <td class="p-4 text-right">
                <div v-if="revokingMemberId === member.id" class="inline-flex items-center justify-end pr-4">
                  <div class="size-3.5 animate-spin rounded-full border border-destructive border-t-transparent" aria-hidden="true" />
                </div>
                <Button
                  v-else-if="!member.isCurrentUser && member.role !== 'owner'"
                  size="sm"
                  variant="ghost"
                  class="h-8 text-xs font-medium text-muted-foreground hover:bg-destructive/10"
                  :class="[member.status === 'active' ? 'hover:text-destructive' : 'hover:text-primary']"
                  @click="handleRevoke(member.id)"
                >
                  {{ member.status === 'active' ? 'Revoke' : 'Activate' }}
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Member Dialog -->
    <Dialog v-model:open="isDialogOpen">
      <DialogContent class="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <PhUserPlus :size="20" class="text-primary" />
            Add Workspace Member
          </DialogTitle>
          <DialogDescription>
            Grant a user access to this tenant by entering their email and assigning their role.
          </DialogDescription>
        </DialogHeader>

        <!-- Form fields -->
        <div class="space-y-4 py-3">
          <div class="space-y-2">
            <Label for="member-email">Email Address</Label>
            <Input
              id="member-email"
              type="email"
              v-model="formEmail"
              placeholder="e.g. employee@company.com"
              required
              class="bg-background focus:ring-2 focus:ring-primary"
            />
          </div>

          <div class="space-y-2">
            <Label for="member-role">Workspace Role</Label>
            <Select id="member-role" v-model="formRole">
              <SelectTrigger class="w-full bg-background focus:ring-2 focus:ring-primary">
                <SelectValue placeholder="Select a workspace role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Compliance Admin</SelectItem>
                <SelectItem value="auditor">External Auditor</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
              </SelectContent>
            </Select>
            <p class="text-[11px] text-muted-foreground">
              * Owner permissions are automatically held by the tenant creator.
            </p>
          </div>
        </div>

        <DialogFooter class="gap-2 sm:gap-0">
          <div class="flex items-center justify-between w-full">
            <div class="min-h-5 text-xs">
              <span v-if="addSuccess" class="flex items-center gap-1 text-success-emphasis font-medium">
                <PhCheckCircle :size="14" weight="fill" />
                Member added successfully
              </span>
              <span v-if="addError" class="flex items-center gap-1 text-destructive-emphasis font-medium">
                <PhWarning :size="14" weight="fill" />
                {{ addError }}
              </span>
            </div>
            <div class="flex gap-2">
              <Button variant="ghost" :disabled="isAdding" @click="isDialogOpen = false">
                Cancel
              </Button>
              <Button :disabled="!formEmail || isAdding" @click="handleAddMember" class="font-medium">
                {{ isAdding ? 'Adding...' : 'Add Member' }}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </article>
</template>
