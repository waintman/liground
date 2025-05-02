<template>
  <div class="pv-lines">
    <div class="scroller">
      <template
        v-for="(line, id) in lines"
      >
        <div
          v-if="line"
          :key="`line-${id}`"
          class="item clickable"
          @mouseenter="onMouseEnter(id)"
          @mouseleave="onMouseLeave(id)"
          @click="onClick(line)"
        >
          <span class="left">{{ line.cpDisplay }}</span>
          <span
            class="right"
            @contextmenu.prevent="openMenu($event, line)"
          >
            {{ line.pv }}
          </span>
        </div>
        <div
          v-else
          :key="`placeholder-${id}`"
          class="item placeholder"
        >
          ...
        </div>
      </template>
    </div>
    <footer class="footer">
      <div
        v-if="engineDetails.length > 0"
        class="details"
      >
        {{ engineDetails }}
      </div>
      <div
        class="collapsible"
        @click="toggle"
      >
        <em
          v-show="showExpandIcon"
          class="icon mdi mdi-arrow-expand-down"
        />
        <em
          v-show="showMinimizeIcon"
          class="icon mdi mdi-arrow-expand-up"
        />
      </div>
    </footer>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import ContextMenu from '@imengyu/vue3-context-menu'
export default {
  data () {
    return {
      lines: [],
      engineInfo: {
        name: '',
        author: '',
        options: []
      },
      multipvMulti: [
        {
          cp: 0,
          pv: '',
          ucimove: ''
        }
      ],
      currentEngine: 1,
      pvcount: 0,
      originalMultiPV: 1,
      showOnlyOnePvLine: false, // Flag to show only one PvLine
      showExpandIcon: false, // Flag to show expand-down icon
      showMinimizeIcon: true // Flag to show expand-up icon
    }
  },
  computed: {
    engineDetails () {
      if (this.currentEngine === 1) {
        const { engineName, engineAuthor } = this.$store.getters
        return `"${engineName}" ${engineAuthor ? 'by ' + engineAuthor : ''}`
      } else {
        const engineName = this.engineInfo.name
        const engineAuthor = this.engineInfo.author
        return `"${engineName}" ${engineAuthor ? 'by ' + engineAuthor : ''}`
      }
    },
    currentMove () {
      for (let num = 0; num < this.moves.length; num++) {
        if (this.moves[num].fen === this.fen) {
          return this.moves[num]
        }
      }
      return null
    },
    ...mapGetters(['moves', 'fen', 'multipv', 'engineSettings', 'mainFirstMove', 'PvE', 'active', 'turn', 'enginetime', 'PvEValue', 'PvEParam', 'PvEInput', 'nodes', 'depth', 'seldepth'])
  },
  watch: {
    pvcount () {
      let i
      this.lines = []
      for (i = 0; i < this.pvcount; i++) {
        this.lines.push(0)
      }
    },
    multipvMulti () {
      this.updateMultiLines()
    },
    multipv () {
      this.updateLines()
    },
    engineSettings () {
      this.originalMultiPV = this.engineSettings.MultiPV
      this.updateLines()
    },
    nodes () {
      if (this.active && this.PvE && !this.turn) {
        if (this.PvEValue === 'nodes') {
          if (this.nodes >= (this.PvEInput)) {
            this.onClick(this.lines[0])
          }
        }
      }
    },
    depth () {
      if (this.active && this.PvE && !this.turn) {
        if (this.PvEValue === 'depth') {
          if (this.depth >= (this.PvEInput)) {
            this.onClick(this.lines[0])
          }
        }
      }
    }
  },
  methods: {
    fillpvCount (payload) {
      this.pvcount = payload
      this.originalMultiPV = payload
    },
    currentEngineIndex (payload) {
      this.currentEngine = payload
    },
    fillPV (payload) {
      this.multipvMulti = payload
    },
    fillInfo (payload) {
      this.engineInfo = payload
    },
    openMenu (event, line) {
      ContextMenu.showContextMenu({
        x: event.x,
        y: event.y,
        items: [
          {
            label: 'Play as main line',
            onClick: () => this.asMain(line)
          },
          {
            label: 'Playe as alternative',
            onClick: () => this.asAlt(line)
          }
        ]
      })
    },
    asMain (line) {
      const mainLine = line.pvUCI.split(' ')
      const prevMov = this.currentMove
      console.log(mainLine)
      this.$store.dispatch('pushMainLine', { line: mainLine, prev: prevMov })
    },
    asAlt (line) {
      const mainLine = line.pvUCI.split(' ')
      const prevMov = this.currentMove
      this.$store.dispatch('pushAltLine', { line: mainLine, prev: prevMov })
    },
    onMouseEnter (id) {
      this.$store.commit('hoveredpv', id)
    },
    onMouseLeave (id) {
      this.$store.commit('hoveredpv', -1)
    },
    onClick (line) {
      this.$store.commit('hoveredpv', -1)
      const prevMov = this.currentMove
      this.$store.dispatch('push', { move: line.ucimove, prev: prevMov })
    },
    updateLines () {
      if (this.currentEngine === 1) {
        const count = this.engineSettings.MultiPV
        const lines = this.multipv.filter(el => typeof el.pv === 'string' && el.pv.length > 0)
        this.lines = lines.concat(Array(count ? Math.max(0, count - lines.length) : 0).fill(null))
        if (this.showOnlyOnePvLine) {
          this.lines = this.lines.slice(1, 2)
        }
      }
    },
    updateMultiLines () {
      if (this.currentEngine !== 1) {
        const count = this.pvcount
        const lines = this.multipvMulti.filter(el => typeof el.pv === 'string' && el.pv.length > 0)
        this.lines = lines.concat(Array(count ? Math.max(0, count - lines.length) : 0).fill(null))
        if (this.showOnlyOnePvLine) {
          this.lines = this.lines.slice(1, 2)
        }
      }
    },
    toggle () {
      this.showExpandIcon = !this.showExpandIcon
      this.showMinimizeIcon = !this.showMinimizeIcon
      this.showOnlyOnePvLine = !this.showOnlyOnePvLine
      if (this.currentEngine === 1) {
        this.updateLines()
      } else {
        this.updateMultiLines()
      }
    }
  }
}
</script>

<style scoped>
.pv-lines {
  background-color: var(--second-bg-color);
  border: 1px solid var(--main-border-color);
  font-weight: 100;
  white-space: nowrap;
}
.scroller {
  max-height: 12em;
  overflow-x: scroll;
}

.list {
  min-width: 100%;
  display: table;
}
.item {
  height: 2em;
  padding: 5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  user-select: none;
}
.item + .item {
  border-top: 1px solid var(--main-border-color);
}
.item.clickable {
  cursor: pointer;
}
.item.clickable:hover {
  background-color: var(--dark-highlight-color);
}
.item > .left {
  margin-right: 5px;
  font-family: sans-serif;
  font-weight: 1000;
  text-align: center;
}
.item > .right {
  text-align: left;
  flex: 0 0 auto;
}
.item.placeholder {
  font-family: sans-serif;
  justify-content: center;
}

.footer {
  display: flex;
}

.details {
  border-top: 1px solid var(--main-border-color);
  font-size: 8pt;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  font-style: oblique;
  flex-grow: 1;
}

.collapsible {
  color: var(--light-text-color);
  background-color: var(--button-color);
  padding: 1px;
  border: 2px solid var(--main-border-color);
  text-decoration: none;
  cursor: pointer;
  width: 20px;
  border: none;
  text-align: right;
  outline: none;
  font-size: 12px;
  text-align: center;
}

.collapsible:hover {
  background-color: var(--hover-color);
}
</style>
