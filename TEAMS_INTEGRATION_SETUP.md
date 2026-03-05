# Microsoft Teams Integration - Setup Guide

## Overview

The Microsoft Teams integration has been successfully implemented following the same plug-and-play OAuth pattern as the YouTube integration. Users can now connect their Microsoft Teams accounts, list recorded meetings, and use them directly in learning track modules.

## What Was Implemented

### Backend (Supabase Edge Functions)

1. **`teams-connect`** - Initiates OAuth flow with Microsoft Azure AD
2. **`teams-callback`** - Handles OAuth callback and stores encrypted tokens
3. **`teams-disconnect`** - Revokes integration and clears tokens
4. **`teams-list-videos`** - Lists recorded meetings from Microsoft Graph API
5. **`teams-health`** - Checks configuration status and provides redirect URI

### Shared Utilities

1. **`teamsCrypto.ts`** - AES-GCM encryption for refresh tokens
2. **`teamsState.ts`** - HMAC-signed OAuth state tokens

### Frontend Components

1. **`TeamsIntegrationCard.tsx`** - Integration card with connect/disconnect functionality
2. **`TeamsVideoSelector.tsx`** - Modal for selecting recorded meetings
3. **`teamsIntegrationDb.ts`** - Database layer and API client functions
4. **Updated `Integrations.tsx`** - Added Teams integration alongside YouTube
5. **Updated `ResourceEmbed.tsx`** - Added Teams video embed support

## Required Configuration

### Azure AD App Registration

To enable the Teams integration, you need to create an app registration in Azure AD:

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Enter a name (e.g., "Kairoos Teams Integration")
5. Supported account types: **Accounts in any organizational directory (Any Azure AD directory - Multitenant)**
6. Click **Register**

### Configure Redirect URI

1. In your app registration, go to **Authentication**
2. Add a platform: **Web**
3. Redirect URI: Get this from the Integrations page (it will be shown in the "Status da configuração" section)
   - Format: `https://YOUR_SUPABASE_URL/functions/v1/teams-callback`
4. Click **Configure**

### Configure API Permissions

1. Go to **API permissions** in your app registration
2. Click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
3. Add the following permissions:
   - `OnlineMeetings.Read.All` - Read online meetings
   - `ChannelMessage.Read.All` - Read channel messages (for recordings)
4. Click **Add permissions**
5. Click **Grant admin consent** for your organization

### Generate Client Secret

1. Go to **Certificates & secrets** in your app registration
2. Click **New client secret**
3. Enter a description and choose an expiration period
4. Click **Add**
5. **Copy the secret value immediately** (you won't be able to see it again)

### Configure Supabase Secrets

Add the following secrets in your Supabase project:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Go to **Edge Functions** → **Manage Secrets**
4. Add the following secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `TEAMS_CLIENT_ID` | Application (client) ID from Azure AD | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `TEAMS_CLIENT_SECRET` | Client secret value from Azure AD | `abc123...` |
| `TEAMS_OAUTH_STATE_SECRET` | Random secret for OAuth state signing | Generate a random 32+ character string |
| `TEAMS_TOKEN_ENC_KEY` | Base64-encoded 32-byte key for token encryption | Generate with: `openssl rand -base64 32` |
| `APP_BASE_URL` | Your application base URL | `https://your-app.com` |
| `SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Your Supabase anon key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | `eyJhbGci...` |

### Generate Required Secrets

#### TEAMS_OAUTH_STATE_SECRET
```bash
# Generate a random string (32+ characters)
openssl rand -hex 32
# Or use any random string generator
```

#### TEAMS_TOKEN_ENC_KEY
```bash
# Generate a 32-byte key and encode in base64
openssl rand -base64 32
```

## Usage

### Connecting Microsoft Teams

1. Navigate to `/integrations`
2. Click "Conectar" on the Microsoft Teams card
3. You'll be redirected to Microsoft to sign in and authorize
4. After authorization, you'll be redirected back with a success message

### Disconnecting Microsoft Teams

1. Navigate to `/integrations`
2. Click "Desconectar" on the Microsoft Teams card
3. The integration will be revoked and tokens cleared

### Using Teams Videos in Learning Tracks

The `TeamsVideoSelector` component can be integrated into track module forms to allow users to select recorded meetings:

```tsx
import { TeamsVideoSelector } from "@/components/videos/TeamsVideoSelector";
import { TeamsVideo } from "@/lib/teamsIntegrationDb";

function ModuleForm() {
  const [selectorOpen, setSelectorOpen] = useState(false);

  const handleSelectVideo = (video: TeamsVideo) => {
    // Use video.embedUrl or video.originalUrl
    console.log("Selected video:", video);
  };

  return (
    <>
      <Button onClick={() => setSelectorOpen(true)}>
        Importar do Teams
      </Button>

      <TeamsVideoSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelect={handleSelectVideo}
      />
    </>
  );
}
```

### Playing Teams Videos

The `ResourceEmbed` component automatically detects and renders Teams videos:

```tsx
<ResourceEmbed
  url="https://teams.microsoft.com/..."
  title="Meeting Recording"
/>
```

## Architecture

### OAuth Flow

1. User clicks "Connect" → `teams-connect` edge function
2. Edge function generates state token and redirects to Microsoft
3. User authorizes on Microsoft
4. Microsoft redirects to `teams-callback` with authorization code
5. Edge function exchanges code for access + refresh tokens
6. Refresh token is encrypted and stored in `user_video_integrations`
7. User is redirected back to `/integrations?teams=connected`

### Token Management

- **Access tokens**: Stored temporarily, valid for ~60 minutes
- **Refresh tokens**: Encrypted with AES-GCM and stored in database
- **Automatic refresh**: When listing videos, if access token is expired, it's automatically refreshed using the encrypted refresh token

### Security

- All tokens are encrypted using AES-256-GCM
- Encryption key is stored as a Supabase secret
- OAuth state tokens are HMAC-signed to prevent CSRF
- RLS policies on `user_video_integrations` ensure users can only access their own integrations

## Troubleshooting

### "Missing secret" error

- Check that all required secrets are configured in Supabase
- Use the "Verificar configuração" button to see which secrets are missing

### "Acesso bloqueado" or consent error

- Ensure the redirect URI is correctly configured in Azure AD
- Check that API permissions are granted (admin consent)
- Verify the app is not in "Testing" mode without test users

### "Não foi possível listar vídeos"

- Check that the user has permissions to access recorded meetings
- Verify that `OnlineMeetings.Read.All` permission is granted
- Check browser console for detailed error messages

### Token refresh fails

- The user may need to reconnect their account
- Check that `TEAMS_TOKEN_ENC_KEY` is correctly configured
- Verify the refresh token hasn't been revoked

## Database Schema

The integration uses the existing `user_video_integrations` table with `provider = 'teams'`:

```sql
CREATE TABLE user_video_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL, -- 'teams'
  status TEXT NOT NULL DEFAULT 'disconnected',
  refresh_token_enc TEXT,
  refresh_token_iv TEXT,
  access_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, provider)
);
```

## Future Enhancements

Potential improvements for future iterations:

1. **Support for channel videos** - Not just meetings, but also channel content
2. **Automatic sync** - Periodically sync new recordings
3. **Transcriptions** - Display meeting transcriptions alongside videos
4. **Analytics** - Track video views and completion rates
5. **Offline access** - Download videos for offline viewing
6. **Advanced filtering** - Filter by date, duration, participants, etc.

## Support

For issues or questions:

1. Check the "Verificar configuração" dialog on the Integrations page
2. Review browser console for detailed error messages
3. Check Supabase Edge Function logs
4. Verify Azure AD app registration settings