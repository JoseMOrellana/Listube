# -*- coding: utf-8 -*-

import os
import pickle
from flask import Flask, jsonify, session, redirect, url_for, request, render_template
import requests
from functools import wraps

import google_auth_oauthlib.flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build


CLIENT_SECRETS_FILE = "client_secret.json"


SCOPES = ['https://www.googleapis.com/auth/youtube']
API_SERVICE_NAME = 'youtube'
API_VERSION = 'v3'

api_key = "AIzaSyB6D-l_xnZMZcpfXGfKRZJE5lrIIGhdZfY"
youtube = build("youtube", "v3", developerKey=api_key)

app = Flask(__name__)
app.secret_key = 'Big secret, i know'
port = int(os.environ.get("PORT", 5000))

def with_credentials(func):
    @wraps(func)
    def inner():
        req_data = request.get_json()
        if req_data and "token" in req_data:
            token = req_data["token"]
            filename = token + ".pickle"

            credentials = None

            if os.path.exists(filename):
                with open(filename, 'rb') as token:
                    credentials = pickle.load(token)
                    if not credentials.valid:
                        if credentials and credentials.expired and credentials.refresh_token:
                            credentials.refresh(Request())
                return func(credentials)
                
            else:
                return jsonify({ "success": False, "error": "Token is not valid"})
        else:
            return jsonify({ "success": False, "error": "You need to be authenticated to access this route"})
        
    return inner

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/search', methods=['POST'])
def search():
    search_data = request.get_json()
    search_req = youtube.search().list(
        part="snippet",
        maxResults=20,
        type="video",
        **search_data
    )
    search_res = search_req.execute()

    vid_ids = []
    for item in search_res["items"]:
        vid_ids.append(item["id"]["videoId"])

    vid_req = youtube.videos().list(
        part="contentDetails,snippet",
        id=','.join(vid_ids)
    )

    vid_res = vid_req.execute()

    search_res["items"] = vid_res["items"]

    return jsonify(search_res)


@app.route('/create_playlist', methods=["POST"])
@with_credentials
def create_playlist(credentials):
    youtube_auth = build( API_SERVICE_NAME, API_VERSION, credentials=credentials)

    req_data = request.get_json()

    playlist_create_req = youtube_auth.playlists().insert(
        part="snippet,status",
        body=dict(
            snippet=dict(
                title=req_data["title"],
                description=req_data["description"]
            ),
            status=dict(
                privacyStatus=req_data["privacyStatus"]
            )
        )   
    )

    playlist_create_res = playlist_create_req.execute()

    for videoId in req_data["videosIds"]:
        print(videoId)
        youtube_auth.playlistItems().insert(
            part="snippet,status",
            body=dict(
                snippet=dict(
                    playlistId=playlist_create_res["id"],
                    resourceId=dict(
                        kind="youtube#video",
                        videoId=videoId
                    )
                )
            )
        ).execute()

    return jsonify({ "success": True, "data": playlist_create_res})

@app.route("/rate", methods=["POST"])
@with_credentials
def rate(credentials):
    req_data = request.get_json()

    youtube_auth = build("youtube", "v3", credentials=credentials)
    rate_req = youtube_auth.videos().rate(
        id=req_data["videoId"],
        rating=req_data["rating"]
    )

    rate_res = rate_req.execute()

    return jsonify(rate_res)

@app.route('/login')
def authorize():
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES)

    
    flow.redirect_uri = url_for('oauth2callback', _external=True)

    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt="consent")

    # Store the state so the callback can verify the auth server response.
    session['state'] = state

    return redirect(authorization_url)


@app.route('/oauth2callback')
def oauth2callback():
    # Specify the state when creating the flow in the callback so that it can
    # verified in the authorization server response.
    state = session['state']

    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES, state=state)
    flow.redirect_uri = url_for('oauth2callback', _external=True)

    # Use the authorization server's response to fetch the OAuth 2.0 tokens.
    authorization_response = request.url
    flow.fetch_token(authorization_response=authorization_response)

    # Store credentials in the session.
    # ACTION ITEM: In a production app, you likely want to save these
    #              credentials in a persistent database instead.
    credentials = flow.credentials
    session['credentials'] = credentials_to_dict(credentials)

    # Save the credentials for the next run
    with open(credentials.token + ".pickle", 'wb') as f:
        pickle.dump(credentials, f)

    return redirect(url_for('index'))


@app.route('/logout', methods=["POST"])
@with_credentials
def revoke(credentials):
    if 'credentials' in session:
        del session['credentials']

    revoke = requests.post('https://oauth2.googleapis.com/revoke',
        params={'token': credentials.token},
        headers = {'content-type': 'application/x-www-form-urlencoded'})

    status_code = getattr(revoke, 'status_code')
    if status_code == 200:
        token = request.get_json()["token"]
        filename = token + ".pickle"

        os.remove(filename)

        return jsonify({ "success": True, "data": {}})
    else:
        return jsonify({ "success": False, "error": "An error ocurred"})


@app.route("/get_credentials")
def get_credentials():
    if 'credentials' in session:
        token = session['credentials']['token']
        refresh_token = session['credentials']['refresh_token']

        return jsonify({ "success": True, "data": { "token": token, "refresh_token": refresh_token}})
    
    return jsonify({ "success": False, "error": "Not credentials found"})


@app.route("/get_ratings", methods=["POST"])
@with_credentials
def get_ratings(credentials):
    data = request.get_json()

    youtube_auth = build("youtube", "v3", credentials=credentials)

    ratings_req = youtube_auth.videos().getRating(id=','.join(data["videoIds"]))

    ratings_res = ratings_req.execute()

    return jsonify(ratings_res)


def credentials_to_dict(credentials):
    return {'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes}


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=port, debug=True)


