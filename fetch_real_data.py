import urllib.request
import json

api_key = 'AIzaSyD8BqbTfsetSfSkCnDjbYXMkQFBnx4HA9M'
channel_id = 'UCuNF36PtETqVFz_yK6C_v-g'

# 1. Fetch channel details
ch_url = f'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id={channel_id}&key={api_key}'
with urllib.request.urlopen(ch_url) as res:
    ch_data = json.loads(res.read())['items'][0]

uploads_id = ch_data['contentDetails']['relatedPlaylists']['uploads']

# 2. Fetch all uploaded videos
pl_url = f'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId={uploads_id}&maxResults=50&key={api_key}'
with urllib.request.urlopen(pl_url) as res:
    pl_data = json.loads(res.read())
    video_ids = [it['contentDetails']['videoId'] for it in pl_data.get('items', [])]

# 3. Fetch full statistics for all videos
vids_url = f'https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id={",".join(video_ids)}&key={api_key}'
with urllib.request.urlopen(vids_url) as res:
    vids_data = json.loads(res.read())

real_data = {
    'channel': {
        'id': ch_data['id'],
        'title': ch_data['snippet']['title'],
        'handle': ch_data['snippet'].get('customUrl', '@The80sGrooveMachine'),
        'avatar': ch_data['snippet']['thumbnails']['medium']['url'],
        'subscribers': int(ch_data['statistics']['subscriberCount']),
        'views': int(ch_data['statistics']['viewCount']),
        'videoCount': int(ch_data['statistics']['videoCount'])
    },
    'videos': []
}

for v in vids_data.get('items', []):
    st = v.get('statistics', {})
    vc = int(st.get('viewCount', 0))
    lc = int(st.get('likeCount', 0))
    cc = int(st.get('commentCount', 0))
    
    dur_raw = v['contentDetails']['duration'].replace('PT', '')
    dur_raw = dur_raw.replace('H', ':').replace('M', ':').replace('S', '')
    parts = dur_raw.split(':')
    if len(parts) == 3:
        dur_formatted = f"{parts[0]}:{parts[1].zfill(2)}:{parts[2].zfill(2)}"
    elif len(parts) == 2:
        dur_formatted = f"{parts[0]}:{parts[1].zfill(2)}"
    else:
        dur_formatted = dur_raw
        
    real_data['videos'].append({
        'id': v['id'],
        'title': v['snippet']['title'],
        'thumbnail': v['snippet']['thumbnails'].get('medium', v['snippet']['thumbnails']['default'])['url'],
        'publishedAt': v['snippet']['publishedAt'].split('T')[0],
        'duration': dur_formatted,
        'views': vc,
        'likes': lc,
        'comments': cc,
        'shares': max(1, int(lc * 0.15)),
        'revenue': round(vc * 0.0025, 2),
        'url': f'https://youtube.com/watch?v={v["id"]}'
    })

with open('real_channel_data.json', 'w', encoding='utf-8') as f:
    json.dump(real_data, f, indent=2, ensure_ascii=False)

print(f"Successfully saved {len(real_data['videos'])} real videos into real_channel_data.json")
