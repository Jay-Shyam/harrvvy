document.addEventListener('DOMContentLoaded', function() {
    const startButton = document.getElementById('startRecording');
    const stopButton = document.getElementById('stopRecording');
    const recordingStatus = document.getElementById('recordingStatus');
    const processingStatus = document.getElementById('processingStatus');
    const transcriptCard = document.getElementById('transcriptCard');
    const transcriptContent = document.getElementById('transcriptContent');
    const ehrResponse = document.getElementById('ehrResponse'); // Get the new EHR display area
    const audioFile = document.getElementById('audioFile');
    const uploadButton = document.getElementById('uploadButton');

    const recorder = new AudioRecorder();

    // Enable upload button when a file is selected
    audioFile.addEventListener('change', function() {
        uploadButton.disabled = !this.files.length;
    });

    startButton.addEventListener('click', async () => {
        try {
            // Hide any previous results
            transcriptCard.classList.add('d-none');
            ehrResponse.innerHTML = ''; // Clear previous EHR response

            // Start recording
            await recorder.start();

            // Update UI
            startButton.disabled = true;
            stopButton.disabled = false;
            recordingStatus.classList.remove('d-none');
        } catch (error) {
            alert('Error starting recording: ' + error.message);
            console.error('Recording error:', error);
        }
    });

    stopButton.addEventListener('click', async () => {
        try {
            // Update UI
            stopButton.disabled = true;
            recordingStatus.classList.add('d-none');
            processingStatus.classList.remove('d-none');

            // Stop recording and get audio blob
            const audioBlob = await recorder.stop();

            // Send to server for processing
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch('/api/process-audio', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Display results
            handleEHRResponse(result);

        } catch (error) {
            alert('Error processing recording: ' + error.message);
            console.error('Processing error:', error);
        } finally {
            // Reset UI
            startButton.disabled = false;
            processingStatus.classList.add('d-none');
        }
    });

    uploadButton.addEventListener('click', async () => {
        const file = audioFile.files[0];
        if (!file) {
            alert('Please select an audio file.');
            return;
        }

        try {
            // Hide any previous results
            transcriptCard.classList.add('d-none');
            ehrResponse.innerHTML = ''; // Clear previous EHR response
            processingStatus.classList.remove('d-none');

            const formData = new FormData();
            formData.append('audio', file);

            const response = await fetch('/api/process-audio', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Display results
            handleEHRResponse(result);

        } catch (error) {
            alert('Error uploading and processing audio: ' + error.message);
            console.error('Upload error:', error);
        } finally {
            processingStatus.classList.add('d-none');
            uploadButton.disabled = true; // Disable after upload
            audioFile.value = ''; // Clear the file input
        }
    });

    function handleEHRResponse(result) {
        if (result.error) {
            alert('Error processing audio: ' + result.error);
            ehrResponse.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        } else {
            // Display transcript if available
            if (result.rawText) {
                transcriptContent.textContent = result.rawText;
                transcriptCard.classList.remove('d-none');
            }

            // Display structured EHR data
            ehrResponse.innerHTML = '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
        }
    }
});