<template>
  <div
    ref="pvLines"
    class="pv-lines"
  >
    <div
      ref="scroller"
      class="scroller"
    >
      <template
        v-for="(line, id) in lines"
        :key="id"
      >
        <div
          v-if="line"
          class="item clickable"
          @mouseenter="onMouseEnter(id)"
          @mouseleave="onMouseLeave"
          @click="onClick(line)"
        >
          <span class="left">{{ line.cpDisplay }}</span>
          <span
            class="right"
            @contextmenu.prevent="openMenu($event, line)"
          >
            <span
              v-for="(entry, idx) in line.pv.split(' ')"
              :key="idx"
              class="pv-entry"
              :class="{ 'is-move-token': isMoveToken(entry) }"
              @mouseenter="isMoveToken(entry) && setPreview(id, idx, line.pv.split(' '), $event)"
              @click.stop="isMoveToken(entry) && setBoard(id, idx, line.pv.split(' '))"
            >
              {{ entry }}
            </span>
          </span>
        </div>

        <div
          v-else
          class="item placeholder"
        >
          ...
        </div>
      </template>
    </div>
    <div
      v-if="hasPreviewLine && previewFen"
      class="pv-preview"
      :class="[boardStyle, pieceStyle, 'is2d', { koth: variant==='kingofthehill', rk: variant==='racingkings', dim8x8: dimensionNumber===0, dim9x10: dimensionNumber===3, dim9x9: dimensionNumber===1 }]"
      :style="{ top: `${previewTop}px`, left: `${previewLeft}px` }"
    >
      <div class="cg-board-wrap">
        <div ref="previewBoard" />
      </div>
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
import { markRaw } from 'vue'
import ffish from 'ffish'
import { Chessground } from 'chessgroundx'

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
      previewLineId: null, // Shows which PV line is being previewed
      previewTop: 0,
      previewLeft: 0,
      previewUciIdx: null,
      displayIdx: null,
      previewFen: null,
      previewBoard: null,
      currentEngine: 1,
      pvcount: 0,
      originalMultiPV: 1,
      showOnlyOnePvLine: true, // Flag to show only one PvLine (default collapsed)
      showExpandIcon: true, // Flag to show expand-down icon (default collapsed)
      showMinimizeIcon: false // Flag to show expand-up icon
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
    hasPreviewLine () {
      return this.previewLineId !== null && !!this.lines[this.previewLineId]
    },
    ...mapGetters(['boardStyle', 'pieceStyle', 'dimensionNumber', 'moves', 'fen', 'is960', 'variant', 'orientation', 'multipv', 'engineSettings', 'mainFirstMove'])
  },
  watch: {
    pvcount () {
      let i
      this.lines = []
      for (i = 0; i < this.pvcount; i++) {
        this.lines.push(0)
      }
    },
    multipvMulti: {
      handler: 'updateMultiLines',
      deep: true
    },
    multipv: {
      handler: 'updateLines',
      deep: true
    },
    fen () {
      this.clearPreview()
    },
    orientation () {
      this.clearPreview()
    },
    variant () {
      this.clearPreview()
    },
    lines () {
      if (this.previewLineId === null) return
      if (!this.lines[this.previewLineId]) {
        this.clearPreview()
      }
    },
    engineSettings: {
      handler () {
        this.originalMultiPV = this.engineSettings.MultiPV
        this.updateLines()
      },
      deep: true
    }
  },
  beforeUnmount () {
    this.clearPreview()
    this.$store.commit('hoveredpv', -1)
  },
  mounted () {
    this.updateLines()
  },
  methods: {
    ensurePreviewBoard () {
      const el = Array.isArray(this.$refs.previewBoard)
        ? this.$refs.previewBoard[0]
        : this.$refs.previewBoard
      if (!el) return

      if (!this.previewBoard || this.previewBoard.state.geometry !== this.dimensionNumber) {
        if (this.previewBoard) this.previewBoard.destroy()
        this.previewBoard = markRaw(Chessground(el, {
          coordinates: false,
          fen: this.previewFen || this.fen,
          orientation: this.orientation,
          highlight: { lastMove: false, check: false },
          drawable: { enabled: false, visible: false },
          movable: { enabled: false },
          geometry: this.dimensionNumber
        }))
      }
    },
    updatePreviewFen () {
      if (!this.previewFen) return
      this.ensurePreviewBoard()
      if (this.previewBoard) {
        this.previewBoard.set({ fen: this.previewFen, variant: this.variant, lastMove: false })
      }
    },
    fillpvCount (payload) {
      this.pvcount = payload
      this.originalMultiPV = payload
    },
    currentEngineIndex (payload) {
      this.currentEngine = payload
      if (payload === 1) this.updateLines()
      else this.updateMultiLines()
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
            label: 'Play as alternative',
            onClick: () => this.asAlt(line)
          }
        ]
      })
    },
    asMain (line) {
      const mainLine = line.pvUCI.split(' ')
      const prevMov = this.currentMove
      this.$store.dispatch('pushMainLine', { line: mainLine, prev: prevMov })
    },
    asAlt (line) {
      const mainLine = line.pvUCI.split(' ')
      const prevMov = this.currentMove
      this.$store.dispatch('pushAltLine', { line: mainLine, prev: prevMov })
    },
    computePreviewFen (baseFen, pvUciMoves, plyCount) {
      const b = this.is960
        ? new ffish.Board(this.variant, baseFen, true)
        : new ffish.Board(this.variant, baseFen)

      try {
        for (let i = 0; i < plyCount; i++) {
          if (!b.push(pvUciMoves[i])) throw new Error('Invalid PV move')
        }
        return b.fen()
      } finally {
        b.delete()
      }
    },
    countMovesUpTo (entries, displayIdx) {
      let moveNum = 0
      for (let i = 0; i <= displayIdx; i++) {
        if (this.isMoveToken(entries[i])) {
          moveNum++
        }
      }
      return moveNum
    },
    setPreview (lineId, displayIdx, entries, event) {
      const previewIdx = this.previewIndex(displayIdx, entries)
      if (previewIdx === null) {
        this.clearPreview()
        return
      }

      this.updatePreviewPosition(event)
      if (previewIdx === null) return
      const uciIndex = this.countMovesUpTo(entries, previewIdx)
      this.previewLineId = lineId
      this.previewUciIdx = uciIndex
      this.displayIdx = previewIdx

      const uciMoves = this.lines[lineId].pvUCI.trim().split(/\s+/)
      const plyCount = uciIndex
      try {
        this.previewFen = this.computePreviewFen(this.fen, uciMoves, plyCount)
        this.$nextTick(() => this.updatePreviewFen())
      } catch (e) {
        this.clearPreview()
      }
    },
    async setBoard (lineId, displayIdx, entries) {
      const previewIdx = this.previewIndex(displayIdx, entries)
      if (previewIdx === null) return
      const uciIndex = this.countMovesUpTo(entries, previewIdx)
      this.previewLineId = lineId
      this.previewUciIdx = uciIndex
      this.displayIdx = previewIdx

      const uciMoves = this.lines[lineId].pvUCI.trim().split(/\s+/)
      const plyCount = uciIndex
      const fallbackFEN = this.fen
      try {
        for (let i = 0; i < plyCount; i++) {
          const prevMov = this.currentMove
          await this.$store.dispatch('push', { move: uciMoves[i], prev: prevMov })
        }
      } catch (e) {
        this.$store.commit('hoveredpv', -1)
        this.$store.dispatch('fen', fallbackFEN)
      }
      this.clearPreview()
    },
    updatePreviewPosition (event) {
      const pvLinesEl = this.$refs.pvLines
      if (!pvLinesEl || !event || !event.currentTarget) return

      const lineEl = event.currentTarget.closest('.item')
      if (!lineEl) return

      const pvRect = pvLinesEl.getBoundingClientRect()
      const lineRect = lineEl.getBoundingClientRect()
      const scrollerEl = this.$refs.scroller
      const scrollLeft = scrollerEl ? scrollerEl.scrollLeft : 0
      this.previewTop = lineRect.bottom - pvRect.top
      this.previewLeft = lineRect.left - pvRect.left + scrollLeft
    },
    clearPreview () {
      this.previewLineId = null
      this.displayIdx = null
      this.previewUciIdx = null
      this.previewFen = null
      if (this.previewBoard) this.previewBoard.destroy()
      this.previewBoard = null
      this.previewTop = 0
      this.previewLeft = 0
    },
    previewIndex (displayIdx, entries) {
      const entry = entries[displayIdx]
      if (this.isMoveNumber(entry)) {
        return this.nextMoveIndex(displayIdx + 1, entries)
      }
      if (!this.isMoveToken(entry)) {
        return null
      }
      return displayIdx
    },
    nextMoveIndex (startIdx, entries) {
      for (let idx = startIdx; idx < entries.length; idx++) {
        if (this.isMoveToken(entries[idx])) {
          return idx
        }
      }
      return null
    },
    isMoveNumber (entry) {
      return /^\d+\.+$/.test(entry) // Match move numbers like "1." or "12..."
    },
    isMoveToken (entry) {
      return typeof entry === 'string' && entry.length > 0 && !this.isMoveNumber(entry)
    },
    onMouseEnter (id) {
      this.$store.commit('hoveredpv', id)
      this.ensurePreviewBoard()
    },
    onMouseLeave () {
      this.clearPreview()
      this.$store.commit('hoveredpv', -1)
    },
    onClick (line) {
      if (!line || !line.ucimove) return
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
          this.lines = this.lines.slice(0, 1)
        }
      }
    },
    updateMultiLines () {
      if (this.currentEngine !== 1) {
        const count = this.pvcount
        const lines = this.multipvMulti.filter(el => typeof el.pv === 'string' && el.pv.length > 0)
        this.lines = lines.concat(Array(count ? Math.max(0, count - lines.length) : 0).fill(null))
        if (this.showOnlyOnePvLine) {
          this.lines = this.lines.slice(0, 1)
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
  overflow: visible;
  position: relative;
  white-space: nowrap;
}
.pv-entry.is-move-token:hover {
  font-weight: bold;
}
.pv-preview {
  display: inline-block;
  position: absolute;
  z-index: 20;
  border-radius: 6px;
  overflow: hidden;
  filter: drop-shadow(4px 4px 3px black)
}

.pv-preview .cg-wrap {
  width: 160px;
  height: 160px;
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
