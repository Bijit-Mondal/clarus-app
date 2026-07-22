<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { PhArrowLeft, PhX } from '@phosphor-icons/vue'

const router = useRouter()

const ssoSchema = z.object({
  email: z.string().min(1, 'Work email is required').email('Enter a valid email address'),
})

type SsoForm = z.infer<typeof ssoSchema>

const form = reactive<SsoForm>({
  email: '',
})

const touched = reactive<Record<keyof SsoForm, boolean>>({
  email: false,
})

const errors = reactive<Record<keyof SsoForm, string>>({
  email: '',
})

function validateField(field: keyof SsoForm) {
  touched[field] = true
  const result = ssoSchema.shape[field].safeParse(form[field])
  errors[field] = result.success ? '' : (result.error.issues[0]?.message ?? '')
}

function hasError(field: keyof SsoForm) {
  return touched[field] && !!errors[field]
}

function handleSubmit() {
  for (const field of Object.keys(form) as (keyof SsoForm)[]) {
    validateField(field)
  }
  if (!ssoSchema.safeParse(form).success) return
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4 py-12">
    <div class="w-full max-w-md">
      <div class="flex flex-col gap-6">
        <div class="flex items-start">
          <Button variant="ghost" size="icon" @click="router.push('/')" class="mb-4">
            <PhArrowLeft class="h-4 w-4" />
          </Button>
          <div class="flex flex-col gap-2 w-full">
            <h1 class="text-2xl font-semibold tracking-tight text-center">Login with SSO</h1>
            <p class="text-muted-foreground text-center">
              Enter your work email to continue with SSO
            </p>
          </div>
        </div>
        <div class="grid gap-4">
          <Button
            class="w-full flex items-center justify-center gap-2 border border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground dark:border-border dark:bg-card dark:text-card-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
            type="button"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
          <Button
            class="w-full flex items-center justify-center gap-2 border border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground dark:border-border dark:bg-card dark:text-card-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
            type="button"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <rect width="11" height="11" x="1" y="1" fill="#f25022" />
              <rect width="11" height="11" x="12" y="1" fill="#7fba00" />
              <rect width="11" height="11" x="1" y="12" fill="#00a4ef" />
              <rect width="11" height="11" x="12" y="12" fill="#ffb900" />
            </svg>
            Continue with Microsoft
          </Button>
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div class="relative flex justify-center text-xs">
              <span class="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <form class="flex flex-col gap-1.5" @submit.prevent="handleSubmit" novalidate>
            <Label for="email">Work Email</Label>
            <Input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="gavin@hooli.xyz"
              autocomplete="email"
              :class="
                hasError('email')
                  ? 'border-destructive focus-visible:ring-destructive/50 focus-visible:border-destructive'
                  : ''
              "
              @blur="validateField('email')"
            />
            <p
              v-if="hasError('email')"
              class="flex items-center gap-1 text-xs text-destructive-emphasis"
            >
              <PhX class="h-3 w-3" />
              {{ errors.email }}
            </p>
          </form>
          <Button class="w-full" type="submit" @click="handleSubmit"> Continue with SSO </Button>
        </div>
        <div class="text-center text-sm text-muted-foreground">
          Don't have an account?
          <RouterLink to="/register" class="underline underline-offset-4 hover:text-foreground"
            >Register</RouterLink
          >
        </div>
      </div>
    </div>
  </div>
</template>
