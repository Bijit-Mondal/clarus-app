<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhArrowLeft, PhCheck, PhX } from '@phosphor-icons/vue'
import ClarusLogo from '@/components/shell/ClarusLogo.vue'

const router = useRouter()

const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type RegisterForm = z.infer<typeof registerSchema>

const form = reactive<RegisterForm>({
  fullName: '',
  email: '',
  password: '',
})

type Field = keyof RegisterForm

const touched = reactive<Record<Field, boolean>>({
  fullName: false,
  email: false,
  password: false,
})

const errors = reactive<Record<Field, string>>({
  fullName: '',
  email: '',
  password: '',
})

function validateField(field: Field) {
  touched[field] = true
  const result = registerSchema.shape[field].safeParse(form[field])
  errors[field] = result.success ? '' : result.error.issues[0].message
}

function hasError(field: Field) {
  return touched[field] && !!errors[field]
}

function canSubmit() {
  const result = registerSchema.safeParse(form)
  return result.success
}

function handleSubmit() {
  for (const field of Object.keys(form) as Field[]) {
    validateField(field)
  }
  if (!canSubmit()) return
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4 py-12">
    <div class="w-full max-w-sm">
      <div class="flex flex-col gap-8">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors self-start -ml-1"
          @click="router.push('/')"
        >
          <PhArrowLeft class="h-4 w-4" />
          Back
        </button>

        <div class="flex flex-col items-center gap-4">
          <ClarusLogo :size="48" />
          <div class="flex flex-col gap-1 text-center">
            <h1 class="text-xl font-semibold tracking-tight">Create your account</h1>
            <p class="text-sm text-muted-foreground">Enter your details to get started</p>
          </div>
        </div>

        <form class="flex flex-col gap-5" @submit.prevent="handleSubmit" novalidate>
          <div class="flex flex-col gap-1.5">
            <Label for="fullName">Full Name</Label>
            <Input
              id="fullName"
              v-model="form.fullName"
              type="text"
              placeholder="Jane Smith"
              :class="
                hasError('fullName')
                  ? 'border-destructive focus-visible:ring-destructive/50 focus-visible:border-destructive'
                  : ''
              "
              @blur="validateField('fullName')"
            />
            <p
              v-if="hasError('fullName')"
              class="flex items-center gap-1 text-xs text-destructive-emphasis"
            >
              <PhX class="h-3 w-3" />
              {{ errors.fullName }}
            </p>
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="email">Email</Label>
            <Input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="jane@company.com"
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
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="password">Password</Label>
            <Input
              id="password"
              v-model="form.password"
              type="password"
              placeholder="At least 8 characters"
              autocomplete="new-password"
              :class="
                hasError('password')
                  ? 'border-destructive focus-visible:ring-destructive/50 focus-visible:border-destructive'
                  : ''
              "
              @blur="validateField('password')"
            />
            <div class="flex items-center justify-between">
              <p
                v-if="hasError('password')"
                class="flex items-center gap-1 text-xs text-destructive-emphasis"
              >
                <PhX class="h-3 w-3" />
                {{ errors.password }}
              </p>
              <p
                v-else-if="touched.password && form.password.length >= 8"
                class="flex items-center gap-1 text-xs text-success-emphasis"
              >
                <PhCheck class="h-3 w-3" />
                Strong enough
              </p>
              <p v-else class="text-xs text-muted-foreground">Min. 8 characters</p>
            </div>
          </div>

          <Button class="w-full" type="submit"> Create account </Button>
        </form>

        <p class="text-center text-sm text-muted-foreground">
          Already have an account?
          <RouterLink
            to="/"
            class="font-medium underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Sign in
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
