<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { PhArrowRight, PhStack } from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import { Button } from '@/components/ui/button'

const route = useRoute()

const title = computed(() => (route.meta.title as string) ?? 'Page')
</script>

<template>
  <article>
    <PageHeader />

    <section aria-label="Page content">
      <slot>
        <div class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <span
            class="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <PhStack :size="24" weight="fill" />
          </span>
          <div class="max-w-sm space-y-1">
            <h2 class="text-base font-semibold text-foreground">
              Nothing here yet
            </h2>
            <p class="text-sm leading-relaxed text-muted-foreground text-pretty">
              This is where the <span class="font-medium text-foreground">{{ title }}</span>
              view will live. The shell, navigation, and design system are ready
              for your feature to land.
            </p>
          </div>
          <Button size="sm" class="mt-1">
            Get started
            <PhArrowRight :size="15" weight="bold" class="ml-1.5" aria-hidden="true" />
          </Button>
        </div>
      </slot>
    </section>
  </article>
</template>
