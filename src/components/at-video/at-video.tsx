import { Component, h, State, Element, Listen } from '@stencil/core';

@Component({
  tag: 'at-video',
  styleUrl: 'at-video.css',
  shadow: true,
})
export class MyVideoPlayer {
  @Element() el: HTMLElement;

  @State() isPaused: boolean = true;
  @State() isMuted: boolean = false;
  @State() playbackRate: number = 1;
  @State() currentTime: string = '0:00';
  @State() totalTime: string = '';
  @State() volume: number = 1;
  @State() isScrubbing: boolean = false;
  @State() isFullscreen: boolean = false;
  @State() isTheater: boolean = false;
  @State() isMiniPlayer: boolean = false;

  private videoElement: HTMLVideoElement;
  private progressPosition: number = 0;
  private previewPosition: number = 0;
  private timelineContainer: HTMLElement;

  componentDidLoad() {
    this.videoElement = this.el.shadowRoot.querySelector('video');
    this.videoElement.addEventListener('loadeddata', this.handleLoadedData);
    this.videoElement.addEventListener('timeupdate', this.handleTimeUpdate);
    this.videoElement.addEventListener('volumechange', this.handleVolumeChange);
    this.videoElement.addEventListener('play', () => (this.isPaused = false));
    this.videoElement.addEventListener('pause', () => (this.isPaused = true));
    this.videoElement.addEventListener('enterpictureinpicture', () => (this.isMiniPlayer = true));
    this.videoElement.addEventListener('leavepictureinpicture', () => (this.isMiniPlayer = false));
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);

    this.timelineContainer.addEventListener('mousemove', this.handleTimelineUpdate);
    this.timelineContainer.addEventListener('mousedown', this.toggleScrubbing);
    document.addEventListener('mouseup', e => {
      if (this.isScrubbing) this.toggleScrubbing(e);
    });
    document.addEventListener('mousemove', e => {
      if (this.isScrubbing) this.handleTimelineUpdate(e);
    });
  }

  setTimelineContainerRef = (element: HTMLElement) => {
    this.timelineContainer = element;
  };

  @Listen('keydown', { target: 'window' })
  handleKeyDown(ev: KeyboardEvent) {
    if (ev.target instanceof HTMLElement && ev.target.tagName === 'INPUT') {
      return;
    }
    switch (ev.key.toLowerCase()) {
      case ' ':
      case 'k':
        ev.preventDefault();
        this.togglePlay();
        break;
      case 'f':
        this.toggleFullScreenMode();
        break;
      case 't':
        this.toggleTheaterMode();
        break;
      case 'i':
        this.toggleMiniPlayerMode();
        break;
      case 'm':
        this.toggleMute();
        break;
      case 'arrowleft':
      case 'j':
        this.skip(-5);
        break;
      case 'arrowright':
      case 'l':
        this.skip(5);
        break;
      case 'c':
        this.toggleCaptions();
        break;
    }
  }

  togglePlay = () => {
    if (this.videoElement.paused) {
      this.videoElement.play();
    } else {
      this.videoElement.pause();
    }
  };

  toggleMute = () => {
    this.isMuted = !this.isMuted;
    this.videoElement.muted = this.isMuted;
  };

  toggleTheaterMode = () => {
    this.isTheater = !this.isTheater;
  };

  toggleMiniPlayerMode = () => {
    if (!this.isMiniPlayer) {
      this.videoElement.requestPictureInPicture();
    } else {
      document.exitPictureInPicture();
    }
  };

  toggleFullScreenMode = () => {
    if (!document.fullscreenElement) {
      this.el.shadowRoot.querySelector('.video-container').requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  handleFullscreenChange = () => {
    this.isFullscreen = !!document.fullscreenElement;
  };

  handleLoadedData = () => {
    this.totalTime = this.formatDuration(this.videoElement.duration);
  };

  handleTimeUpdate = () => {
    this.currentTime = this.formatDuration(this.videoElement.currentTime);
    this.progressPosition = this.videoElement.currentTime / this.videoElement.duration;
  };

  handleVolumeChange = () => {
    this.volume = this.videoElement.volume;
    this.isMuted = this.videoElement.muted;
  };

  skip = (time: number) => {
    this.videoElement.currentTime += time;
  };

  formatDuration = (time: number) => {
    const seconds = Math.floor(time % 60);
    const minutes = Math.floor(time / 60) % 60;
    const hours = Math.floor(time / 3600);
    if (hours === 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  togglePlaybackSpeed = () => {
    let newPlaybackRate = this.videoElement.playbackRate + 0.25;
    if (newPlaybackRate > 2) newPlaybackRate = 0.25;
    this.videoElement.playbackRate = newPlaybackRate;
    this.playbackRate = newPlaybackRate;
  };

  toggleCaptions = () => {
    const captions = this.videoElement.textTracks[0];
    captions.mode = captions.mode === 'showing' ? 'hidden' : 'showing';
  };

  handleTimelineUpdate = (e: MouseEvent) => {
    if (!this.timelineContainer) return;
    const rect = this.timelineContainer.getBoundingClientRect();
    const percent = Math.min(Math.max(0, e.clientX - rect.left), rect.width) / rect.width;
    this.previewPosition = percent;
    if (this.isScrubbing) {
      this.progressPosition = percent;
      const scrubTime = percent * this.videoElement.duration;
      this.currentTime = this.formatDuration(scrubTime);
    }
  };

  toggleScrubbing = (e: MouseEvent) => {
    // Use clientX for mouse position relative to the viewport to calculate the percentage correctly.
    this.isScrubbing = e.type === 'mousedown';

    if (this.isScrubbing) {
      document.addEventListener('mousemove', this.handleTimelineMouseMove);
      document.addEventListener('mouseup', this.endScrubbing);
      this.videoElement.pause();
    }
  };

  handleTimelineMouseMove = (e: MouseEvent) => {
    if (!this.isScrubbing) return;
    if (!this.timelineContainer) return;

    const rect = this.timelineContainer.getBoundingClientRect();
    const percent = Math.min(Math.max(0, e.clientX - rect.left), rect.width) / rect.width;
    const scrubTime = percent * this.videoElement.duration;

    // Temporarily update currentTime for user feedback, but don't set video currentTime here
    // to avoid seeking jitters while dragging.
    this.currentTime = this.formatDuration(scrubTime);
    this.progressPosition = percent;
  };

  endScrubbing = (e: MouseEvent) => {
    // Ensure we remove event listeners to prevent memory leaks
    document.removeEventListener('mousemove', this.handleTimelineMouseMove);
    document.removeEventListener('mouseup', this.endScrubbing);

    // Check if timelineContainer is indeed set
    if (!this.timelineContainer) {
      console.error('Timeline container not found');
      return;
    }

    const rect = this.timelineContainer.getBoundingClientRect();
    const percent = Math.min(Math.max(0, e.clientX - rect.left), rect.width) / rect.width;
    const desiredTime = percent * this.videoElement.duration;

    // Directly seek to the desired time without delay
    this.videoElement.currentTime = desiredTime;

    // Log for debugging
    console.log(`Seeking to ${desiredTime} seconds`);

    // Wait for the 'seeked' event before considering play
    this.videoElement.addEventListener(
      'seeked',
      () => {
        console.log(`Successfully seeked to ${this.videoElement.currentTime}`);
        this.videoElement.currentTime = desiredTime;

        // Only play the video if it was not paused before scrubbing started
        if (!this.isPaused) {
          this.videoElement.play();
        }
      },
      { once: true },
    );

    this.isScrubbing = false;
  };

  adjustVolume = (e: Event) => {
    const input = e.target as HTMLInputElement;
    this.videoElement.volume = parseFloat(input.value);
    this.isMuted = this.videoElement.volume === 0;
  };

  // Implementing the render function with detailed controls
  render() {
    return (
      <div
        class={`
          video-container ${this.isPaused && 'paused'} ${this.isTheater && 'theater'}
           ${this.isFullscreen && 'full-screen'}
          ${this.isMiniPlayer && 'mini-player'}
          ${this.isScrubbing && 'scrubbing'}
        `}
        data-volume-level={this.isMuted ? 'muted' : this.volume > 0.5 ? 'high' : this.volume > 0 ? 'low' : 'muted'}
      >
        <img class="thumbnail-img" />

        {/* Video controls: play/pause, volume, timeline, etc. */}
        <div class="video-controls-container">
          {/* <div class="timeline-container">
            <div class="timeline">
              <img class="preview-img" />
            </div>
          </div> */}
          <div class="timeline-container" ref={this.setTimelineContainerRef}>
            <div class="timeline" style={{ '--progress-position': this.progressPosition.toString(), '--preview-position': this.previewPosition.toString() }}>
              {/* Timeline updates */}
              <div class="thumb-indicator"></div>
            </div>
          </div>
          <div class="controls">
            <button class="play-pause-btn" onClick={this.togglePlay}>
              {this.isPaused ? (
                <svg class="play-icon" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                </svg>
              ) : (
                <svg class="pause-icon" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
                </svg>
              )}
            </button>
            <div class="volume-container">
              <button class="mute-btn" onClick={this.toggleMute}>
                <svg class="volume-high-icon" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"
                  />
                </svg>
                <svg class="volume-low-icon" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M5,9V15H9L14,20V4L9,9M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.76 18.5,12Z" />
                </svg>
                <svg class="volume-muted-icon" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z"
                  />
                </svg>
              </button>
              <input class="volume-slider" type="range" min="0" max="1" step="any" value={this.volume.toString()} onInput={this.adjustVolume} />
            </div>

            <div class="duration-container">
              <div class="current-time">{this.currentTime}</div>/<div class="total-time">{this.totalTime}</div>
            </div>

            <button class="captions-btn" onClick={this.toggleCaptions}>
              <svg viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M18,11H16.5V10.5H14.5V13.5H16.5V13H18V14A1,1 0 0,1 17,15H14A1,1 0 0,1 13,14V10A1,1 0 0,1 14,9H17A1,1 0 0,1 18,10M11,11H9.5V10.5H7.5V13.5H9.5V13H11V14A1,1 0 0,1 10,15H7A1,1 0 0,1 6,14V10A1,1 0 0,1 7,9H10A1,1 0 0,1 11,10M19,4H5C3.89,4 3,4.89 3,6V18A2,2 0 0,0 5,20H19A2,2 0 0,0 21,18V6C21,4.89 20.1,4 19,4Z"
                />
              </svg>
            </button>
            <button class="speed-btn" onClick={this.togglePlaybackSpeed}>{`${this.playbackRate}x`}</button>
            <button class="mini-player-btn" onClick={this.toggleMiniPlayerMode}>
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7h9v6h-9z" />
              </svg>
            </button>
            <button class="theater-btn" onClick={this.toggleTheaterMode}>
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 7H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 8H5V9h14v6z" />
              </svg>
            </button>
            <button class="full-screen-btn" onClick={this.toggleFullScreenMode}>
              {this.isFullscreen ? (
                <svg class="close" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg class="open" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <video src="../../assets/ir-booking-details.tsx - ir-webcmp - Visual Studio Code 2023-09-15 20-45-58.mp4" ref={el => (this.videoElement = el as HTMLVideoElement)}>
          <track kind="captions" srclang="en" src="assets/subtitles.vtt" default />
        </video>
      </div>
    );
  }
}
