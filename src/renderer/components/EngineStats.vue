<template>
  <div class="base-demo">
    <table class="custom-table">
      <thead>
        <tr>
          <th v-for="header in headers" :key="header">
            {{ header }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td v-for="value in values" :key="value">
            {{ value }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: 'EngineStats',
  data () {
    return {
      headers: ['Depth / Sel. Depth', 'Nodes/s', 'Nodes', 'Time', 'Hash', 'TB Hits'],
      parentEngineStats: {
        depth: 0,
        seldepth: 0,
        nodes: 0,
        nps: 0,
        hashfull: 0,
        tbhits: 0,
        enginetime: 0
      },
      engineIndex: 1
    }
  },

  computed: {
    values () {
      const source = this.engineIndex === 1 ? this.$store.getters : this.parentEngineStats
      const { depth, seldepth, nps, nodes, enginetime, hashfull, tbhits } = source
      return [
        `${depth} / ${seldepth}`,
        `${this.parse(nps)} nps`,
        this.parse(nodes),
        this.parseTime(enginetime),
        hashfull,
        this.parse(tbhits)
      ]
    }
  },
  methods: {
    fillID (payload) {
      this.engineIndex = payload
    },
    fillStats (payload) {
      this.parentEngineStats = payload
    },
    parse (value) {
      if (value > 1000000) {
        value /= 1000000
        return String(value.toFixed(1)) + ' M'
      }

      if (value > 1000) {
        value /= 1000
        return String(value.toFixed(1)) + ' k'
      }
      return String(value)
    },
    parseTime (value) {
      const date = new Date(Number(value))
      return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
    }
  }
}
</script>

<style>
.custom-table {
  width: 100%;
  border-collapse: collapse;
}

.custom-table thead {
  font-style: normal;
  font-weight: bold;
  background-color: #ddd;
}

.custom-table tbody {
  font-style: normal;
  font-weight: bold;
  font-weight: normal
}
</style>
