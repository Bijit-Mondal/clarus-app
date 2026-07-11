<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import ClarusLogo from '@/components/shell/ClarusLogo.vue'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4 py-12">
    <div class="w-full max-w-md">
      <div class="flex flex-col gap-6">
        <div class="flex justify-center">
          <ClarusLogo :size="64" />
        </div>
        <div class="flex flex-col gap-2 text-center">
          <h1 class="text-2xl font-semibold tracking-tight">Sign in to your account</h1>
        </div>
        <div class="grid gap-4">
          <Button class="w-full" @click="router.push('/login/sso')"> Sign in with SSO </Button>
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div class="relative flex justify-center text-xs">
              <span class="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <Button class="w-full" variant="secondary" @click="router.push('/login/email')">
            Sign in with email
          </Button>
        </div>
        <div class="text-center text-sm text-muted-foreground">
          New to Clarus?
          <RouterLink to="/register" class="underline underline-offset-4 hover:text-foreground"
            >Create account</RouterLink
          >
        </div>
      </div>
    </div>
  </div>
</template>
