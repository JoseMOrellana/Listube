const searchInput = document.querySelector("#search");
const submitSearch = document.querySelector("#submit");
const form = document.querySelector("#form");
const results = document.querySelector("#results");
const playlist = document.querySelector("#playlist-list");
const nextPage = document.querySelector("#next-page");
const prevPage = document.querySelector("#prev-page");
const videoCounterDisplay = document.querySelector("#count");
const timeCounterDisplay = document.querySelector("#time");
const submitListDataButton = document.querySelector("#submitListData");
const titleInput = document.querySelector("#titleInput");
const descriptionInput = document.querySelector("#descriptionInput");
const watchHereButton = document.querySelector("#watchHere");
const searchItemModel = document.querySelector("#searchItemModel");
const playlistItemModel = document.querySelector("#playlistItemModel");
const loginButton = document.querySelector("#loginButton");
const logoutButton = document.querySelector("#logoutButton");
const playlistContainer = document.querySelector("#playlist");
const previousVideoButton = document.querySelector("#previousVideo");
const nextVideoButton = document.querySelector("#nextVideo");
const videoFrame = document.querySelector("#yt-player");
const searchArea = document.querySelector("#searchArea");
const watchArea = document.querySelector("#watchArea");
const ratingButtonsContainer = document.querySelector("#ratingButtons");
const likeButton = document.querySelector("#likeButton");
const dislikeButton = document.querySelector("#dislikeButton");
const watchYoutubeButton = document.querySelector("#watchYoutube");
const loginToWatchButton = document.querySelector("#loginToWatch");
const playlistFormModal = document.querySelector("#playlistForm");
const ghostModel = document.querySelector("#ghost");
const sidebarCollapseButton = document.querySelector("#sidebarCollapse");
const contentArea = document.querySelector("#content");
const alertElement = document.querySelector("#alert");
const alertText = document.querySelector("#alertText");
const alertClose = document.querySelector("#alertClose");

let credentials;

let nextPageToken, prevPageToken;

let videoCounter, timeCounter;
let videos = [];

let playlistIndex = 0;

const segRe = /(\d*)S/;
const minRe = /(\d*)M/;
const hourRe = /(\d*)H/;

searchInput.addEventListener("keyup", (e) => {
    submitSearch.disabled = e.target.value === "";
});

titleInput.addEventListener("keyup", (e) => {
    submitListData.disabled = e.target.value === "";
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    results.classList.add("d-none");

    const spinner = searchArea.querySelector(".spinner");
    spinner.classList.remove("d-none");

    const response = await axios.post("http://localhost:5000/search", {
        q: searchInput.value,
    });

    fillResults(response.data);
    spinner.classList.add("d-none");
});

playlistContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
});

playlistContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    const video = JSON.parse(e.dataTransfer.getData("snippet"));
    transferVideo(video);
});

const transferVideo = (video) => {
    const { channelTitle, publishedAt, title } = video.snippet;
    const { duration } = video.contentDetails;
    if (videos.some((vid) => vid.id === video.id)) {
        alertText.innerHTML = `${title} already  added!`;
        alertElement.classList.remove("d-none");
    } else {
        const listItem = playlistItemModel.cloneNode(true);
        const image = listItem.querySelector("#videoThumbnail");
        const vidLength = listItem.querySelector("#videoLength");
        const titleEle = listItem.querySelector("#videoTitle");
        const channel = listItem.querySelector("#videoChannel");
        const timePassed = listItem.querySelector("#videoTimeAgo");
        const deleteIcon = listItem.querySelector("#deleteIcon");

        image.src = video.snippet.thumbnails.medium.url;

        const secMatch = segRe.exec(duration);
        const minMatch = minRe.exec(duration);
        const hourMatch = hourRe.exec(duration);
        let vidLengthContent;
        if (secMatch) {
            vidLengthContent = `${secMatch[1]}`;
        } else {
            vidLengthContent = "00";
        }
        if (minMatch) {
            vidLengthContent = `${minMatch[1]}:`.concat(vidLengthContent);
        } else {
            vidLengthContent = "00:".concat(vidLengthContent);
        }
        if (hourMatch) {
            vidLengthContent = `${hourMatch[1]}:`.concat(vidLengthContent);
        }
        vidLength.appendChild(document.createTextNode(vidLengthContent));

        const titleContent =
            video.snippet.title.length > 30
                ? `${video.snippet.title.substring(0, 30)}...`
                : video.snippet.title;
        titleEle.appendChild(document.createTextNode(titleContent));

        channel.appendChild(
            document.createTextNode(video.snippet.channelTitle)
        );

        timePassed.appendChild(
            document.createTextNode(
                timeAgo(new Date(video.snippet.publishedAt))
            )
        );

        deleteIcon.addEventListener("click", (e) => {
            console.log("called");
            videos = videos.filter((vid) => vid.id !== video.id);
            playlist.removeChild(listItem);
            refreshListDetails();

            alertText.innerHTML = `${title} removed from playlist!`;
            alertElement.classList.remove("d-none");
        });

        listItem.classList.remove("d-none");
        playlist.appendChild(listItem);

        videos.push(video);
        refreshListDetails();

        alertText.innerHTML = `${title} added to playlist!`;
        alertElement.classList.remove("d-none");
    }
};

nextPage.addEventListener("click", async () => {
    const response = await axios.post("http://localhost:5000/search", {
        q: searchInput.value,
        pageToken: nextPageToken,
    });

    fillResults(response.data);
});

prevPage.addEventListener("click", async () => {
    const response = await axios.post("http://localhost:5000/search", {
        q: searchInput.value,
        pageToken: prevPageToken,
    });

    fillResults(response.data);
});

watchHereButton.addEventListener("click", async () => {
    searchArea.classList.add("d-none");
    watchArea.classList.remove("d-none");

    if (credentials) {
        ratingButtonsContainer.classList.remove("d-none");
        const videoIds = videos.map((video) => video.id);
        const response = await axios.post("http://localhost:5000/get_ratings", {
            token: credentials.token,
            videoIds,
        });

        if (response.status === 200) {
            videos = videos.map((video, index) => ({
                ...video,
                rating: response.data.items[index].rating,
            }));
        }
    }

    const videoElements = document.querySelectorAll("#playlist-list li");
    videoElements.forEach((videoElement, index) => {
        videoElement.addEventListener("click", () => {
            playlistIndex = index - 1;
            refreshWatchArea();
        });
        videoElement.style.cursor = "pointer";
    });

    refreshWatchArea();
});

submitListDataButton.addEventListener("click", async (e) => {
    e.preventDefault();
    const videosIds = videos.map((video) => video.id);
    const title = titleInput.value;
    const description = descriptionInput.value;
    const privacyStatus = document.querySelector(
        "input[name='privacyStatus']:checked"
    ).value;

    const response = await axios.post("http://localhost:5000/create_playlist", {
        videosIds,
        title,
        description,
        privacyStatus,
        token: credentials.token,
    });
    console.log(response);
    const playlistId = response.data.data.id;

    window.location.href = `https:www.youtube.com/playlist?list=${playlistId}`;
});

const fillResults = (data) => {
    results.innerHTML = "";

    data.items.forEach((video) => {
        const listItem = searchItemModel.cloneNode(true);
        const image = listItem.querySelector("#videoThumbnail");
        const vidLength = listItem.querySelector("#videoLength");
        const title = listItem.querySelector("#videoTitle");
        const channel = listItem.querySelector("#videoChannel");
        const timePassed = listItem.querySelector("#videoTimeAgo");
        const moveButton = listItem.querySelector("#transferVideo");
        const description = listItem.querySelector("#videoDescription");

        image.src = video.snippet.thumbnails.medium.url;

        const secMatch = segRe.exec(video.contentDetails.duration);
        const minMatch = minRe.exec(video.contentDetails.duration);
        const hourMatch = hourRe.exec(video.contentDetails.duration);
        let vidLengthContent;
        if (secMatch) {
            vidLengthContent = `${secMatch[1]}`;
        } else {
            vidLengthContent = "00";
        }
        if (minMatch) {
            vidLengthContent = `${minMatch[1]}:`.concat(vidLengthContent);
        } else {
            vidLengthContent = "00:".concat(vidLengthContent);
        }
        if (hourMatch) {
            vidLengthContent = `${hourMatch[1]}:`.concat(vidLengthContent);
        }
        vidLength.appendChild(document.createTextNode(vidLengthContent));

        const titleContent =
            video.snippet.title.length > 30
                ? `${video.snippet.title.substring(0, 30)}...`
                : video.snippet.title;
        title.appendChild(document.createTextNode(titleContent));

        channel.appendChild(
            document.createTextNode(video.snippet.channelTitle)
        );

        timePassed.appendChild(
            document.createTextNode(
                timeAgo(new Date(video.snippet.publishedAt))
            )
        );

        moveButton.addEventListener("click", (e) => {
            transferVideo(video);
        });

        const descriptionContent =
            video.snippet.description.length > 100
                ? `${video.snippet.description.substring(0, 100)}...`
                : video.snippet.description;
        description.appendChild(document.createTextNode(descriptionContent));

        // Creating ghost element for dragging event
        const ghost = ghostModel.cloneNode(true);
        ghost.classList.remove("d-none");
        const ghostTitle = ghost.querySelector("#ghostTitle");
        const ghostChannel = ghost.querySelector("#ghostChannel");

        ghostTitle.appendChild(document.createTextNode(titleContent));
        ghostChannel.appendChild(
            document.createTextNode(video.snippet.channelTitle)
        );

        // Adding dragging events
        listItem.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("snippet", JSON.stringify(video));
            console.log(ghost);
            document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, 0, 0);
        });
        listItem.addEventListener("dragend", (e) => {
            document.body.removeChild(ghost);
        });

        listItem.classList.remove("d-none");
        results.appendChild(listItem);
        results.classList.remove("d-none");
    });

    nextPageToken = data.nextPageToken;
    prevPageToken = data.prevPageToken;
    nextPage.classList.remove("d-none");
    if (prevPageToken) {
        prevPage.classList.remove("d-none");
    } else {
        prevPage.classList.add("d-none");
    }
};

const createElement = (type, attributes = {}) => {
    const element = document.createElement(type);
    Object.keys(attributes).forEach((key) => {
        element[key] = attributes[key];
    });

    return element;
};

const refreshListDetails = () => {
    videoCounter = videos.length;

    const totalSeconds = videos.reduce((count, current) => {
        const secMatch = segRe.exec(current.contentDetails.duration);
        const minMatch = minRe.exec(current.contentDetails.duration);
        const hourMatch = hourRe.exec(current.contentDetails.duration);

        const seconds = secMatch ? parseInt(secMatch[1]) : 0;
        const minutes = minMatch ? parseInt(minMatch[1]) : 0;
        const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
        return hours * 3600 + minutes * 60 + seconds + count;
    }, 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    videoCounterDisplay.innerHTML = videoCounter;

    let timeDisplay = `${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    if (hours > 0) {
        timeDisplay = `${hours.toString().padStart(2, "0")}:`.concat(
            timeDisplay
        );
    }
    timeCounterDisplay.innerHTML = timeDisplay;
};

previousVideoButton.addEventListener("click", () => {
    playlistIndex = playlistIndex - 1;
    refreshWatchArea();
});

nextVideoButton.addEventListener("click", () => {
    playlistIndex = playlistIndex + 1;
    refreshWatchArea();
});

likeButton.addEventListener("click", async () => {
    if (likeButton.classList.contains("pressed")) {
        const response = await axios.post("http://localhost:5000/rate", {
            token: credentials.token,
            videoId: videos[playlistIndex].id,
            rating: "none",
        });

        changeRatingButton(likeButton, false);
    } else {
        const response = await axios.post("http://localhost:5000/rate", {
            token: credentials.token,
            videoId: videos[playlistIndex].id,
            rating: "like",
        });
        changeRatingButton(likeButton, true);
        changeRatingButton(dislikeButton, false);
    }
});

dislikeButton.addEventListener("click", async () => {
    if (dislikeButton.classList.contains("pressed")) {
        const response = await axios.post("http://localhost:5000/rate", {
            token: credentials.token,
            videoId: videos[playlistIndex].id,
            rating: "none",
        });

        changeRatingButton(dislikeButton, false);
    } else {
        const response = await axios.post("http://localhost:5000/rate", {
            token: credentials.token,
            videoId: videos[playlistIndex].id,
            rating: "dislike",
        });
        changeRatingButton(dislikeButton, true);
        changeRatingButton(likeButton, false);
    }
});

loginToWatchButton.addEventListener("click", () => {
    localStorage.setItem("displayFormModal", "true");
});

logoutButton.addEventListener("click", async () => {
    const response = await axios.post("http://localhost:5000/logout", {
        token: credentials.token,
    });
    console.log(response);
    if (response.data && response.data.success === true) {
        localStorage.removeItem("credentials");
        logoutButton.classList.add("d-none");
        loginButton.classList.remove("d-none");

        loginToWatchButton.classList.remove("d-none");
        watchYoutubeButton.classList.add("d-none");
    }
    credentials = null;
});

sidebarCollapseButton.addEventListener("click", () => {
    contentArea.classList.toggle("closed-sidebar");
    playlistContainer.classList.toggle("closed-sidebar");
    alertElement.classList.toggle("closed-sidebar");
    sidebarCollapseButton.classList.toggle("closed-sidebar");
});

alertClose.addEventListener("click", () => {
    alertElement.classList.add("d-none");
});

const refreshWatchArea = () => {
    console.log("called");
    document.querySelector("#currentVideo").innerHTML =
        videos[playlistIndex].snippet.title;
    videoFrame.src = `http://www.youtube.com/embed/${videos[playlistIndex].id}?autoplay=1`;

    if (playlistIndex === 0) {
        previousVideoButton.classList.add("d-none");
    } else {
        previousVideoButton.classList.remove("d-none");
    }

    if (credentials) {
        const rating = videos[playlistIndex].rating;
        switch (rating) {
            case "like":
                changeRatingButton(likeButton, true);
                changeRatingButton(dislikeButton, false);
                break;
            case "dislike":
                changeRatingButton(dislikeButton, true);
                changeRatingButton(likeButton, false);
                break;
            case "none":
                changeRatingButton(likeButton, false);
                changeRatingButton(dislikeButton, false);
        }
    }
};

const changeRatingButton = (button, pressed) => {
    const icons = button.querySelectorAll(".bi");
    if (pressed) {
        button.classList.add("pressed");
        icons[0].classList.add("d-none");
        icons[1].classList.remove("d-none");
    } else {
        button.classList.remove("pressed");
        icons[1].classList.add("d-none");
        icons[0].classList.remove("d-none");
    }
};

window.onload = async () => {
    const creds = JSON.parse(localStorage.getItem("credentials"));
    if (creds) {
        credentials = creds;
        loginButton.classList.add("d-none");
        logoutButton.classList.remove("d-none");

        loginToWatchButton.classList.add("d-none");
        watchYoutubeButton.classList.remove("d-none");
    } else {
        const response = await axios.get(
            "http://localhost:5000/get_credentials"
        );
        console.log(response);
        if (response.data.data) {
            const { token, refresh_token } = response.data.data;
            localStorage.setItem(
                "credentials",
                JSON.stringify({ token, refresh_token })
            );
            credentials = { token, refresh_token };

            loginButton.classList.add("d-none");
            logoutButton.classList.remove("d-none");

            loginToWatchButton.classList.add("d-none");
            watchYoutubeButton.classList.remove("d-none");
        }
    }

    const vids = JSON.parse(localStorage.getItem("videos"));
    vids.forEach(transferVideo);
    alertElement.classList.add("d-none");

    const displayFormModal = localStorage.getItem("displayFormModal");
    if (displayFormModal === "true") {
        const modal = new bootstrap.Modal(playlistFormModal);
        modal.show();
    }
    localStorage.removeItem("displayFormModal");
};

const beforeUnload = () => {
    localStorage.setItem("videos", JSON.stringify(videos));
};

window.onbeforeunload = beforeUnload;

window.addEventListener("beforeunload", beforeUnload, false);
