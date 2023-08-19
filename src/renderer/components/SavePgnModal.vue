<template>
  <div class="savePgnModal">
    <div
      class="backdrop"
      @click="close"
    />
    <div class="contents">
      <header class="header">
        {{ title }}
      </header>
      <div class="body">
        <div class="Textbox">
          <textarea
            v-model="pgnString"
            rows="15"
            cols="80"
            placeholder="or Input the PGN String here"
          />
        </div>
      </div>
      <footer class="footer">
        <button
          type="button"
          class="btn green"
          @click="savePgn"
        >
          confirm
        </button>
        <button
          type="button"
          class="btn red"
          @click="close"
        >
          cancel
        </button>
      </footer>
    </div>
  </div>
</template>

<script>
import fs from 'fs'
import { mapGetters } from 'vuex'
import ffish from 'ffish'
function dfs (moves, mainMove, historyString) {
  const items = []
  for (const move of moves) {
    const s = `${parseInt((move.ply + 1) / 2)}${move.ply % 2 ? '.' : '...'} ${move.name} `
    if (move.name === mainMove.name) {
      if (move.next.length) {
        items.push([move.next, move.main])
      }
      if (historyString[0].charAt(historyString[0].length - 1) === '\n') {
        historyString[0] += `${parseInt((move.ply + 1) / 2)}${move.ply % 2 ? '.' : '...'} `
      } else if (move.ply % 2) {
        historyString[0] += `${(move.ply + 1) / 2}. `
      }
      historyString[0] += `${move.name} `
    } else {
      historyString[0] += '\r\n('
      historyString[0] += s
      if (move.next.length) {
        dfs(move.next, move.main, historyString)
      }
      historyString[0] += ')\r\n'
    }
  }
  bfs(items, historyString)
}
function bfs (items, historyString) {
  const moves = []
  if (items.length === 0) {
    return
  }
  while (items.length) {
    moves.push(items.pop())
  }
  while (moves.length) {
    const move = moves.pop()
    for (const n of move[0]) {
      const s = `${parseInt((n.ply + 1) / 2)}${n.ply % 2 ? '.' : '...'} ${n.name} `
      if (n.name !== move[1].name) {
        historyString[0] += '\r\n('
        historyString[0] += s
        if (n.next.length) {
          dfs(n.next, n.main, historyString)
        }
        historyString[0] += ')\r\n'
      } else {
        if (historyString[0].charAt(historyString[0].length - 1) === '\n') {
          historyString[0] += `${parseInt((n.ply + 1) / 2)}${n.ply % 2 ? '.' : '...'} `
        } else if (n.ply % 2) {
          historyString[0] += `${(n.ply + 1) / 2}. `
        }
        historyString[0] += `${n.name} `
        if (n.next.length) {
          items.push([n.next, n.main])
        }
      }
    }
  }
  bfs(items, historyString)
}
export default {
  name: 'SavePgnModal',
  props: {
    title: {
      required: true,
      type: String
    }
  },
  data () {
    const movesString = `[Variant "${this.$store.getters.variantOptions.revGet(this.$store.getters.variant)}"]\r\n[FEN "${this.$store.getters.startFen}"]\r\n\r\n`
    const historyString = [movesString]
    const mainMove = this.$store.getters.mainFirstMove
    const firstMoves = this.$store.getters.firstMoves
    const items = []
    items.push([firstMoves, mainMove])
    bfs(items, historyString)

    // movesString += historyString[0]
    return {
      error: 'none',
      pgnString: historyString[0]
    }
  },
  computed: {
    ...mapGetters(['initialized', 'variantOptions'])
  },
  watch: {
    initialized () {
      if (this.initialized === true) {
        if (localStorage.PGNPath) {
          this.openPGNFromPath(JSON.parse(localStorage.PGNPath))
        }
      }
    }
  },
  methods: {
    close () {
      this.$emit('close')
    },
    savePgn () {
      this.$electron.remote.dialog.showSaveDialog({
        title: 'Save PGN file',
        buttonLabel: 'Save',
        properties: [],
        filters: [
          { name: 'PGN Files', extensions: ['pgn'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      }).then(file => {
        // Stating whether dialog operation was cancelled or not.
        console.log(file.canceled)
        if (!file.canceled) {
          console.log(file.filePath.toString())
          // Creating and Writing to the sample.txt file
          fs.writeFile(file.filePath.toString(),
            this.pgnString, function (err) {
              if (err) throw err
              console.log('Saved!')
            })
        }
      }).catch(err => {
        console.log(err)
      })
    },
    openPGNFromPath (path) {
      fs.readFile(path, 'utf8', (err, data) => {
        if (err) {
          return console.log(err)
        }

        // convert CRLF to LF
        data = data.replace(/\r\n/g, '\n')
        this.convertAndStorePgn(data)
        this.close()
      })
    },
    openPGNFromString () {
      if (this.pgnString === '') {
        // when input empty, do nothing
      } else {
        // convert CRLF to LF
        const data = this.pgnString.replace(/\r\n/g, '\n')
        this.convertAndStorePgn(data)
        this.close()
      }
    },
    convertAndStorePgn (data) {
      const regex = /(?:\[.+ ".*"\]\r?\n)+\r?\n+(?:.+\r?\n)*/gm
      let games = []
      if (this.$store.getters.loadedGames) { // keep already loaded pgns
        games = this.$store.getters.loadedGames
      }
      let numOfUnparseableGames = 0
      let m
      const maxGames = 30 // stops afer parsing 30 games, since large pgns crash liGround. reason so far not clear
      let currentGameCount = 0
      while ((m = regex.exec(data)) !== null && currentGameCount !== maxGames) { // parses over all games in the selected pgn file or String and pushes them onto the games array
        if (m.index === regex.lastIndex) {
          regex.lastIndex++
        }
        m.forEach((match, groupIndex) => {
          let game
          try {
            game = ffish.readGamePGN(match)
          } catch (error) {
            numOfUnparseableGames = numOfUnparseableGames + 1
            return
          }
          currentGameCount++
          games.push(game)
        })
      }

      if (numOfUnparseableGames !== 0) {
        alert(numOfUnparseableGames + ' games could not be parsed.')
      }

      games = games.map((curVal, idx, arr) => {
        curVal.id = idx
        curVal.supported = this.variantOptions.revGet(curVal.headers('Variant').toLowerCase()) !== undefined || !curVal.headers('Variant')
        return curVal
      })

      this.$store.dispatch('loadedGames', games)
    }

  }
}
</script>

<style scoped>
.addPgnModal {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}
.backdrop {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, .3);
  z-index: -1;
}

.contents {
  min-width: 45%;
  min-height: 45%;
  display: flex;
  flex-direction: column;
  background: var(--second-bg-color);
  box-shadow: 2px 2px 20px 1px var(--second-bg-color);
  overflow-x: auto;
}

.header {
  padding: 15px;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--main-border-color);
  color: #4AAE9B;
  user-select: none;
}

.bar {
  background-color: var(--button-color);
}

.Textbox {
  padding: 10px;
  border-top: 1px solid var(--main-border-color);
}

.input {
  padding: 2px 3px;
  background: lightgrey;
  border: none;
  border-radius: 3px;
}

.footer {
  padding: 15px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--main-border-color);
  user-select: none;
}

.btn {
  padding: 2px 3px;
  margin: 2px;
  border: none;
  border-radius: 2px;
  color: white;
  cursor: pointer;
}
.btn.red {
  background: #b22222;
}
.btn.green {
  background: #4AAE9B;
}
.item {
  padding-left: 16px;
  padding-right: 16px;
  padding-top: 1.5%;
  padding-bottom: 1.5%;
  display: inline-block;
  background-color: var(--button-color);
  color: white;
  font-size: 11px;
  text-decoration: none;
  text-align: center;
  cursor: pointer;
}
.item:hover {
  background-color: var(--hover-color);
}
.item.active {
  background-color: #00af89;
}
#pgnString {
  max-width: 75%;
  background-color: var(--second-bg-color);
  color: var(--main-text-color);
}
#pgnString::placeholder {
  color: var(--main-text-color);
}
.pgnStringDiv {
  padding-bottom: 1.5%;
}
</style>
