<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhArrowLeft, PhX } from '@phosphor-icons/vue'
import { getApiErrorMessage } from '@/lib/api'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const route = useRoute()
const { loginMutation } = useAuth()
const submitError = ref('')

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

const form = reactive<LoginForm>({
  email: '',
  password: '',
})

const touched = reactive<Record<keyof LoginForm, boolean>>({
  email: false,
  password: false,
})

const errors = reactive<Record<keyof LoginForm, string>>({
  email: '',
  password: '',
})

function validateField(field: keyof LoginForm) {
  touched[field] = true
  const result = loginSchema.shape[field].safeParse(form[field])
  errors[field] = result.success ? '' : result.error.issues[0].message
}

function hasError(field: keyof LoginForm) {
  return touched[field] && !!errors[field]
}

async function handleSubmit() {
  for (const field of Object.keys(form) as (keyof LoginForm)[]) {
    validateField(field)
  }
  if (!loginSchema.safeParse(form).success) return

  submitError.value = ''
  try {
    await loginMutation.mutateAsync({ ...form })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/orgs'
    await router.replace(redirect)
  } catch (error: unknown) {
    submitError.value = getApiErrorMessage(
      error,
      'We could not sign you in. Check your details and try again.',
    )
  }
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
            <h1 class="text-2xl font-semibold tracking-tight text-center">Login with Email</h1>
            <p class="text-muted-foreground text-center">Enter your email and password</p>
          </div>
        </div>
        <form class="flex flex-col gap-4" @submit.prevent="handleSubmit" novalidate>
          <div class="flex flex-col gap-1.5">
            <Label for="email">Email</Label>
            <Input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="name@example.com"
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
              placeholder="••••••••"
              autocomplete="current-password"
              :class="
                hasError('password')
                  ? 'border-destructive focus-visible:ring-destructive/50 focus-visible:border-destructive'
                  : ''
              "
              @blur="validateField('password')"
            />
            <p
              v-if="hasError('password')"
              class="flex items-center gap-1 text-xs text-destructive-emphasis"
            >
              <PhX class="h-3 w-3" />
              {{ errors.password }}
            </p>
          </div>
          <p
            v-if="submitError"
            class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive-emphasis"
            role="alert"
          >
            {{ submitError }}
          </p>
          <Button class="w-full" type="submit" :disabled="loginMutation.isPending.value">
            {{ loginMutation.isPending.value ? 'Signing in…' : 'Login' }}
          </Button>
        </form>
        <div class="grid gap-3">
          <div class="text-center text-sm text-muted-foreground">
            Don't have an account?
            <RouterLink to="/register" class="underline underline-offset-4 hover:text-foreground"
              >Register</RouterLink
            >
          </div>
          <div class="text-center text-sm text-muted-foreground">
            Forgot password?
            <a href="#" class="underline underline-offset-4 hover:text-foreground"
              >Reset password</a
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
