<script setup lang="ts">
import type { Coin } from '@cosmjs/stargate';

defineProps<{
  balances: Coin[],
  title: string
}>()

</script>

<template>
  <div class="balances-container">
    <h4>
      {{ title }}
    </h4>
    <ul v-for="balance of balances" :key="balance.denom">
      <li>
        {{ balance.amount }} <span class="symbol">{{ balance.denom }}</span>
      </li>

    </ul>
  </div>
</template>


<style scoped>
.balances-container {
  margin-top: 1.2rem;
}


h4 {
  color: white;
  font-weight: bold;
}
</style>