const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "..")
const inputs = [
  "src",
  "public",
  "scripts/build-revision.js",
  "scripts/write-version.js",
  "package.json",
  "package-lock.json",
  "vue.config.js",
]

function sourceDigest() {
  const files = []

  function collect(relativePath) {
    const absolutePath = path.join(root, relativePath)
    if (!fs.existsSync(absolutePath)) return
    const stat = fs.statSync(absolutePath)
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolutePath).sort()) {
        collect(path.join(relativePath, name))
      }
      return
    }
    files.push(relativePath)
  }

  for (const input of inputs) collect(input)
  const digest = crypto.createHash("sha256")
  for (const relativePath of files.sort()) {
    digest.update(relativePath.replace(/\\/g, "/"))
    digest.update("\0")
    digest.update(fs.readFileSync(path.join(root, relativePath)))
    digest.update("\0")
  }
  return digest.digest("hex").slice(0, 12)
}

function buildRevision(version, commit) {
  return `${version}:${commit}:${sourceDigest()}`
}

module.exports = { buildRevision }
