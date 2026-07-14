<script setup lang="ts">
import { computed } from 'vue'
import { PhArrowLeft, PhShieldCheck } from '@phosphor-icons/vue'
import AICPALogo from '@/components/brand/AICPALogo.vue'
import CCPALogo from '@/components/brand/CCPALogo.vue'
import GDPRLogo from '@/components/brand/GDPRLogo.vue'
import HIPAALogo from '@/components/brand/HIPAALogo.vue'
import ISOLogo from '@/components/brand/ISOLogo.vue'

const props = defineProps<{
  name: string
  publisher: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const logoComponent = computed(() => {
  const p = props.publisher
  const n = props.name.toLowerCase()
  if (p === 'AICPA') return AICPALogo
  if (p === 'ISO') return ISOLogo
  if (p === 'HHS' || p === 'hipaa' || n.includes('hipaa')) return HIPAALogo
  if (p === 'GDPR' || p === 'EU' || n.includes('gdpr')) return GDPRLogo
  if (p === 'CCPA' || n.includes('ccpa')) return CCPALogo
  return PhShieldCheck
})
</script>

<template>
  <header class="flex shrink-0 items-center gap-3 pb-5">
    <button
      type="button"
      class="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Back to frameworks"
      @click="emit('back')"
    >
      <PhArrowLeft :size="18" aria-hidden="true" />
    </button>

    <div class="flex min-w-0 flex-1 items-center gap-3">
      <div
        class="flex shrink-0 items-center justify-center rounded-md bg-muted/60 p-1.5 text-foreground"
      >
        <component :is="logoComponent" :size="32" aria-hidden="true" />
      </div>
      <div class="min-w-0">
        <h1 class="truncate text-xl font-semibold tracking-tight text-foreground">
          {{ name }}
        </h1>
        <p class="text-xs text-muted-foreground">Requirement categories</p>
      </div>
    </div>
  </header>
</template>
