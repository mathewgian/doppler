# Doppler

An open source tool that pinpoints the geographic location of an audio recording by analyzing the Doppler shift of background airplane noise.

This project was built with [Lovable](https://lovable.dev).

## Overview

Audio-Doppler-Locator automates a highly manual audio forensics technique. By analyzing the "S-curve" of an airplane's engine noise on a spectrogram, the tool calculates the precise Slant Range (straight-line distance) between the microphone and the aircraft at the Time of Closest Approach (TCA). It then cross-references this acoustic data with historical ADS-B flight paths to triangulate the exact location of the recording.

## Features

*   **Acoustic Spectrogram Analysis:** Automatically extracts the S-curve of passing aircraft using `librosa` and `scipy`.
*   **Physics Engine:** Calculates exact slant range by pulling historical weather data (temperature) to determine the precise speed of sound at the time of recording.
*   **Geospatial Triangulation:** Uses PostGIS to draw a "Doppler Ring" around the aircraft's ground track, filtering millions of historical flight pings in milliseconds.
*   **Automated Data Pruning:** Built-in `pg_cron` scripts maintain a rolling 1-month window of local ADS-B data (e.g., Metro Vancouver) to keep database sizes under 3GB.

## Tech Stack

*   **Frontend:** React / TypeScript (Designed via Lovable)
*   **Backend:** Python / FastAPI
*   **Audio Processing:** Librosa, SciPy, NumPy
*   **Database:** Lovable
*   **External APIs:** OpenSky Network / ADS-B Exchange (Flight Data), OpenWeatherMap (Speed of Sound calculation)
