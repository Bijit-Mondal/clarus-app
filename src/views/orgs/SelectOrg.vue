<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { PhPlus, PhCaretRight } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import ClarusLogo from '@/components/shell/ClarusLogo.vue'

const router = useRouter()
const open = ref(false)
const orgName = ref('')

const dummyOrgs = [
  {
    id: '1',
    name: 'Acme Inc.',
    slug: 'acme',
    logo: 'google',
  },
  {
    id: '2',
    name: 'Globex Corporation',
    slug: 'globex',
    logo: 'microsoft',
  },
]

const googleLogo = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='#4285F4'/><path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='#34A853'/><path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' fill='#FBBC05'/><path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='#EA4335'/></svg>`

const microsoftLogo = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='11' height='11' x='1' y='1' fill='#f25022'/><rect width='11' height='11' x='12' y='1' fill='#7fba00'/><rect width='11' height='11' x='1' y='12' fill='#00a4ef'/><rect width='11' height='11' x='12' y='12' fill='#ffb900'/></svg>`

function logoFor(org: typeof dummyOrgs[number]) {
  return org.logo === 'google' ? googleLogo : microsoftLogo
}

function selectOrg(orgId: string) {
  router.push('/dashboard')
}
</script>

<style scoped>
.org-logo :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4 py-12">
    <div class="w-full max-w-md">
      <div class="flex flex-col gap-8">
        <div class="flex flex-col items-center gap-4">
          <ClarusLogo :size="48" />
          <div class="flex flex-col gap-1 text-center">
            <h1 class="text-2xl font-semibold tracking-tight text-foreground">Select an organization</h1>
            <p class="text-sm text-muted-foreground text-pretty">Choose an existing organization or create a new one to continue</p>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <ul class="flex flex-col gap-2" role="list">
            <li v-for="org in dummyOrgs" :key="org.id">
              <button
                type="button"
                class="group w-full flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring"
                @click="selectOrg(org.id)"
              >
                <span
                  class="org-logo flex size-9 shrink-0 items-center justify-center rounded-md bg-background border border-border overflow-hidden transition-colors"
                  aria-hidden="true"
                  v-html="logoFor(org)"
                />
                <span class="flex min-w-0 flex-1 flex-col">
                  <span class="truncate text-sm font-medium text-foreground">{{ org.name }}</span>
                  <span class="truncate text-xs text-muted-foreground font-mono">{{ org.slug }}</span>
                </span>
                <PhCaretRight
                  :size="16"
                  class="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  aria-hidden="true"
                />
              </button>
            </li>
          </ul>
        </div>

        <div class="relative flex items-center" role="separator" aria-hidden="true">
          <div class="grow border-t border-border"></div>
          <span class="shrink-0 px-3 text-xs uppercase tracking-wider text-muted-foreground">or</span>
          <div class="grow border-t border-border"></div>
        </div>

        <Dialog v-model:open="open">
          <DialogTrigger as-child>
            <Button class="w-full" size="default">
              <PhPlus class="mr-2 h-4 w-4" weight="bold" />
              Create organization
            </Button>
          </DialogTrigger>
          <DialogContent class="max-w-md">
            <DialogHeader>
              <DialogTitle>Create organization</DialogTitle>
              <DialogDescription>
                Create a new organization to manage your compliance and security needs.
              </DialogDescription>
            </DialogHeader>
            <div class="flex flex-col gap-2 py-2">
              <Label for="org-name">Organization name</Label>
              <Input id="org-name" v-model="orgName" placeholder="Organization name" />
              <p class="text-xs text-muted-foreground text-pretty">
                The name of your organization as it will appear throughout the platform.
              </p>
            </div>
            <DialogFooter>
              <Button class="w-full" @click="selectOrg('new')">Create organization</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  </div>
</template>
