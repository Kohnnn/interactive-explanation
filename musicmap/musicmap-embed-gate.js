(function () {
  const PLACEHOLDER_STATE = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
  };

  let activePlayer = null;
  const YOUTUBE_ORIGIN = "https://www.youtube-nocookie.com";
  const SPOTIFY_ORIGIN = "https://open.spotify.com";

  function getEmbedHost() {
    return document.getElementById("youtube-player-iframe");
  }

  function replaceEmbed(node) {
    const host = getEmbedHost();
    if (!host) {
      return null;
    }

    host.replaceChildren(node);
    return node;
  }

  function buildFrame(src, title) {
    const frame = document.createElement("iframe");
    frame.src = src;
    frame.title = title;
    frame.width = "100%";
    frame.height = "100%";
    frame.allow = "autoplay; encrypted-media; picture-in-picture";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.style.border = "0";
    frame.setAttribute("loading", "lazy");
    return frame;
  }

  function normalizePlaylistId(payload) {
    if (!payload) {
      return "";
    }

    if (typeof payload === "string") {
      return payload;
    }

    if (typeof payload.list === "string") {
      return payload.list;
    }

    return "";
  }

  function createYouTubeEmbed(player, index) {
    const playlistId = normalizePlaylistId(player.pendingPlaylist);
    if (!playlistId) {
      return null;
    }

    const params = new URLSearchParams({
      list: playlistId,
      autoplay: "1",
      playsinline: "1",
      rel: "0",
    });
    if (Number.isInteger(index) && index >= 0) {
      params.set("index", String(index));
    }

    player.pendingIndex = Number.isInteger(index) ? index : player.pendingIndex;
    player.playerState = PLACEHOLDER_STATE.PLAYING;
    return replaceEmbed(buildFrame(`${YOUTUBE_ORIGIN}/embed/videoseries?${params.toString()}`, "Musicmap YouTube playlist"));
  }

  function createSpotifyEmbed(href) {
    if (!href) {
      return null;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(href, window.location.href);
    } catch {
      return null;
    }

    if (parsedUrl.hostname !== "open.spotify.com" && parsedUrl.hostname !== "player.spotify.com") {
      return null;
    }

    const playlistMatch = parsedUrl.pathname.match(/\/playlist\/([^/?]+)/i);
    if (!playlistMatch) {
      return null;
    }

    const params = new URLSearchParams({
      uri: `spotify:playlist:${playlistMatch[1]}`,
      theme: "0",
    });

    return replaceEmbed(buildFrame(`${SPOTIFY_ORIGIN}/embed/playlist?${params.toString()}`, "Musicmap Spotify playlist"));
  }

  class DeferredMusicmapPlayer {
    constructor(elementId, options) {
      this.elementId = elementId;
      this.options = options || {};
      this.pendingPlaylist = null;
      this.pendingIndex = 0;
      this.playerState = PLACEHOLDER_STATE.UNSTARTED;
      activePlayer = this;
    }

    cuePlaylist(payload) {
      this.pendingPlaylist = payload;
      this.pendingIndex = Number.isInteger(payload?.index) ? payload.index : 0;
      this.playerState = PLACEHOLDER_STATE.CUED;
    }

    playVideoAt(index) {
      this.pendingIndex = index;
      createYouTubeEmbed(this, index);
    }

    getPlayerState() {
      return this.playerState;
    }

    pauseVideo() {
      this.playerState = PLACEHOLDER_STATE.PAUSED;
    }
  }

  const PlaceholderYT = {
    Player: function PlaceholderPlayer(elementId, options) {
      return new DeferredMusicmapPlayer(elementId, options);
    },
    PlayerState: PLACEHOLDER_STATE,
  };

  window.YT = PlaceholderYT;

  Object.defineProperty(window, "onYouTubeIframeAPIReady", {
    configurable: true,
    get() {
      return undefined;
    },
    set(callback) {
      Object.defineProperty(window, "onYouTubeIframeAPIReady", {
        configurable: true,
        writable: true,
        value: function noopMusicmapYouTubeReady() {},
      });

      queueMicrotask(() => {
        if (typeof callback === "function") {
          callback();
        }
      });
    },
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("#right-side-pane-songlist a");
    if (!trigger || !activePlayer) {
      return;
    }

    event.preventDefault();
    const index = Number(trigger.getAttribute("data-index") || "0");
    activePlayer.playVideoAt(Number.isFinite(index) ? index : 0);
  }, true);

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("#youtube-playlist-link");
    if (!trigger || !activePlayer) {
      return;
    }

    event.preventDefault();
    activePlayer.playVideoAt(activePlayer.pendingIndex || 0);
  }, true);

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("#spotify-playlist-link");
    if (!trigger) {
      return;
    }

    event.preventDefault();
    createSpotifyEmbed(trigger.getAttribute("href") || "");
  }, true);
})();
