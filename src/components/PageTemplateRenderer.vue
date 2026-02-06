<template>
  <div class="page-template-renderer">
    <!-- 用 render 函数渲染，不写 template 里的结构 -->
  </div>
</template>

<script>
export default {
  name: "PageTemplateRenderer",
  props: {
    layout: {
      type: Array,
      required: true, // 后端返回的 layout 数组
    },
    model: {
      type: Object,
      default: () => ({}), // 表单数据对象，比如 { username: '', email: '' }
    },
    templateId: {
      type: String,
      required: true, // 用于提交时调用后端 /page_template/submit?template_id=...
    },
  },
  methods: {
    // 入口渲染方法
    renderNode(h, node) {
      const type = node.type
      const props = node.props || {}
      const children = node.children || []

      if (type === "row") {
        return h(
          "el-row",
          {
            props: {
              gutter: props.gutter,
              justify: props.justify,
              align: props.align,
            },
          },
          children.map((c) => this.renderNode(h, c))
        )
      }

      if (type === "col") {
        return h(
          "el-col",
          {
            props: {
              span: props.span,
              offset: props.offset,
              push: props.push,
              pull: props.pull,
            },
          },
          children.map((c) => this.renderNode(h, c))
        )
      }

      if (type === "text") {
        return h(
          "el-text",
          {
            props: {
              type: props.type,
              size: props.size,
              truncated: props.truncated,
            },
          },
          [props.content || ""]
        )
      }

      if (type === "form") {
        return h(
          "el-form",
          {
            ref: "formRef",
            props: {
              model: this.model,
              labelWidth: props.label_width,
              inline: props.inline,
              size: props.size,
            },
          },
          children.map((c) => this.renderNode(h, c))
        )
      }

      if (type === "form_item") {
        const prop = props.prop
        const label = props.label
        const required = props.required
        const inner = []

        if (children && children.length > 0) {
          children.forEach((c) => {
            inner.push(this.renderNode(h, c))
          })
        } else if (prop) {
          // 默认渲染一个 input / input-number
          const isNumber = props.input_type === "number"
          const compName = isNumber ? "el-input-number" : "el-input"
          inner.push(
            h(compName, {
              props: { value: this.model[prop] },
              on: {
                input: (val) => {
                  this.$set(this.model, prop, val)
                },
              },
            })
          )
        }

        return h("el-form-item", { props: { label, prop, required } }, inner)
      }

      if (type === "button") {
        const onClick = () => this.handleButtonClick(props)
        return h(
          "el-button",
          {
            props: {
              type: props.type,
              size: props.size,
              plain: props.plain,
              round: props.round,
              circle: props.circle,
              icon: props.icon,
            },
            on: { click: onClick },
          },
          [props.text || "按钮"]
        )
      }

      if (type === "card") {
        return h(
          "el-card",
          { props: { header: props.header, shadow: props.shadow } },
          children.map((c) => this.renderNode(h, c))
        )
      }

      if (type === "space") {
        return h(
          "el-row",
          { props: { type: "flex", gutter: props.gap || 8 } },
          children.map((c) => h("el-col", [this.renderNode(h, c)]))
        )
      }

      // 未识别类型，直接渲染子级
      return h(
        "div",
        children.map((c) => this.renderNode(h, c))
      )
    },

    async handleButtonClick(btnProps) {
      const action = btnProps.action
      if (btnProps.confirm) {
        try {
          await this.$confirm(
            btnProps.confirm_text || "确认执行该操作？",
            "提示",
            {
              type: "warning",
            }
          )
        } catch (e) {
          return
        }
      }

      if (action === "submit") {
        this.$emit("submit") // 交给父组件去调后端 /page_template/submit
      } else if (action === "reset") {
        this.$refs.formRef && this.$refs.formRef.resetFields()
      } else if (action === "cancel") {
        this.$emit("cancel")
      } else if (action === "custom") {
        // 预留：根据 btnProps.api / api_method 自己封装请求
      }
    },
  },
  render(h) {
    return h(
      "div",
      { staticClass: "page-template-renderer" },
      this.layout.map((node) => this.renderNode(h, node))
    )
  },
}
</script>
