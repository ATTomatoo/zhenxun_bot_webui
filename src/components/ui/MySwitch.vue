<template>
  <div
    class="my-switch"
    :class="{
      'is-disabled': disabled,
      'is-checked': myValue,
    }"
    @click="toggleSwitch"
  >
    <input
      v-model="myValue"
      type="checkbox"
      class="my-switch__input"
      :disabled="disabled"
    />
    <span class="my-switch__track">
      <span class="my-switch__thumb" />
    </span>
  </div>
</template>

<script>
export default {
  name: "MySwitch",
  props: {
    value: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      myValue: this.value,
    }
  },
  watch: {
    value(newVal) {
      this.myValue = newVal
    },
  },
  methods: {
    toggleSwitch() {
      if (!this.disabled) {
        this.myValue = !this.myValue
        this.$emit("input", this.myValue)
        this.$emit("change", this.myValue)
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.my-switch {
  display: inline-flex;
  align-items: center;
  position: relative;
  line-height: 1;
  height: 22px;
  vertical-align: middle;
  cursor: pointer;
  user-select: none;

  &.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &__input {
    position: absolute;
    width: 0;
    height: 0;
    opacity: 0;
    margin: 0;
    pointer-events: none;
  }

  /* 轨道 */
  &__track {
    display: inline-block;
    position: relative;
    width: 44px;
    height: 22px;
    border-radius: 11px;
    box-sizing: border-box;
    background: var(--el-border-color-light);
    border: 1px solid var(--el-border-color-lighter, rgba(0, 0, 0, 0.06));
    transition: background 0.25s ease, box-shadow 0.25s ease;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);

    .my-switch.is-checked & {
      background: var(--primary-color);
      border-color: var(--primary-color);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08),
        0 0 0 3px rgba(255, 107, 149, 0.2);
    }

    .my-switch.is-disabled & {
      background: var(--el-fill-color-light);
      border-color: var(--el-border-color-lighter);
      box-shadow: none;
    }

    .my-switch.is-checked.is-disabled & {
      background: var(--primary-color-light-7);
      border-color: var(--primary-color-light-7);
      opacity: 0.8;
    }
  }

  /* 滑块 */
  &__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 1px rgba(0, 0, 0, 0.1);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);

    .my-switch.is-checked & {
      transform: translateX(24px);
    }

    .my-switch.is-disabled & {
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }
  }

  &:active:not(.is-disabled) .my-switch__thumb {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  }
}

@media (max-width: 640px) {
  .my-switch {
    height: 20px;

    &__track {
      width: 40px;
      height: 20px;
      border-radius: 10px;
    }

    &__thumb {
      width: 14px;
      height: 14px;
      top: 2px;
      left: 2px;

      .my-switch.is-checked & {
        transform: translateX(22px);
      }
    }
  }
}
</style>
