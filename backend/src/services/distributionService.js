import axios from 'axios';
import pool from '../db/pool.js';

export async function connectSocialAccount(userId, payload) {
  const result = await pool.query(
    `INSERT INTO social_accounts (user_id, platform, account_name, account_id, access_token, refresh_token, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (user_id, platform)
     DO UPDATE SET account_name = EXCLUDED.account_name,
                   account_id = EXCLUDED.account_id,
                   access_token = EXCLUDED.access_token,
                   refresh_token = EXCLUDED.refresh_token,
                   metadata = EXCLUDED.metadata,
                   connected_at = NOW()
     RETURNING id, user_id, platform, account_name, account_id, metadata, connected_at`,
    [
      userId,
      payload.platform,
      payload.accountName || null,
      payload.accountId || null,
      payload.accessToken,
      payload.refreshToken || null,
      JSON.stringify(payload.metadata || {})
    ]
  );
  return result.rows[0];
}

export async function listSocialAccounts(userId) {
  const result = await pool.query(
    'SELECT id, platform, account_name, account_id, metadata, connected_at FROM social_accounts WHERE user_id = $1 ORDER BY platform',
    [userId]
  );
  return result.rows;
}

async function getAccount(userId, platform) {
  const result = await pool.query(
    'SELECT * FROM social_accounts WHERE user_id = $1 AND platform = $2',
    [userId, platform]
  );
  if (result.rowCount === 0) {
    throw new Error(`No ${platform} account connected`);
  }
  return result.rows[0];
}

export async function publishPost(post) {
  const platform = post.platform.toLowerCase();
  if (platform === 'linkedin') return publishLinkedIn(post);
  if (platform === 'x') return publishX(post);
  if (platform === 'instagram') return publishInstagram(post);
  throw new Error(`Unsupported platform: ${platform}`);
}

async function publishLinkedIn(post) {
  const account = await getAccount(post.user_id, 'linkedin');
  const author = account.account_id || account.metadata?.personUrn || account.metadata?.organizationUrn;
  if (!author) throw new Error('LinkedIn account_id must be a person or organization URN');

  const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', {
    author,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: `${post.caption}\n\n${(post.hashtags || []).join(' ')}` },
        shareMediaCategory: 'NONE'
      }
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
  }, {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      'X-Restli-Protocol-Version': '2.0.0'
    }
  });
  return { externalPostId: response.data.id, providerResponse: response.data };
}

async function publishX(post) {
  const account = await getAccount(post.user_id, 'x');
  const response = await axios.post('https://api.twitter.com/2/tweets', {
    text: `${post.caption}\n\n${(post.hashtags || []).slice(0, 5).join(' ')}`
  }, {
    headers: { Authorization: `Bearer ${account.access_token}` }
  });
  return { externalPostId: response.data.data.id, providerResponse: response.data };
}

async function publishInstagram(post) {
  const account = await getAccount(post.user_id, 'instagram');
  if (!post.media_url) {
    throw new Error('Instagram publishing requires media_url for the connected business account');
  }

  const container = await axios.post(
    `https://graph.facebook.com/v20.0/${account.account_id}/media`,
    null,
    {
      params: {
        image_url: post.media_url,
        caption: `${post.caption}\n\n${(post.hashtags || []).join(' ')}`,
        access_token: account.access_token
      }
    }
  );
  const publish = await axios.post(
    `https://graph.facebook.com/v20.0/${account.account_id}/media_publish`,
    null,
    {
      params: {
        creation_id: container.data.id,
        access_token: account.access_token
      }
    }
  );
  return { externalPostId: publish.data.id, providerResponse: publish.data };
}
