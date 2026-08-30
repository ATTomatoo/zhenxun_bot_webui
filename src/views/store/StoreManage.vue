<template>
  <div class="store-page">
    <StoreTemplate />
  </div>
</template>

<script>
import StoreTemplate from "@/components/store/StoreTemplate.vue"

export default {
  name: "StoreManage",
  components: { StoreTemplate },
}
</script>

<style scoped>
.store-page {
  min-height: 100%;
  background: var(--bg-color);
}
</style>
