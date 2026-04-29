# MongoDB Atlas Setup Guide

## Step 1: Create a MongoDB Atlas Account

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Click **Sign Up** (or Log In if you have an account)
3. Sign up with:
   - Email address
   - Password
   - Accept terms and proceed
4. You'll be prompted to set up your first organization and project (you can use defaults)

## Step 2: Create a Cluster

1. After signing up, click **Create** (or **Create a Deployment**)
2. Choose **M0 Free** tier (perfect for development/testing)
3. Select your **Cloud Provider** (AWS, Google Cloud, or Azure - any works)
4. Select your **Region** (choose one closest to you or your deployment location)
5. Name your cluster (e.g., `gameforge-cluster`)
6. Click **Create Deployment**
7. Wait 2-5 minutes for cluster creation

## Step 3: Create a Database User

1. In the cluster page, click the **Security** tab on the left
2. Click **Database Access**
3. Click **+ Add New Database User**
4. Choose **Password** as the authentication method
5. Create credentials:
   - **Username**: (e.g., `gameforge_user`)
   - **Password**: (create a strong password - copy and save it!)
   - **Built-in Role**: Select `readWriteAnyDatabase`
6. Click **Add User**

## Step 4: Whitelist IP Address

1. Still in **Security** section, click **Network Access**
2. Click **+ Add IP Address**
3. Choose **Allow Access from Anywhere** (for development)
   - This adds `0.0.0.0/0` to allow all IPs
   - For production, add only your server's IP
   - If you're testing locally without `0.0.0.0/0`, add your current public IP instead
4. Click **Confirm**

## Step 5: Get Your Connection String

1. Go back to your cluster (click cluster name or **Databases** tab)
2. Click the **Connect** button
3. Choose **Drivers** option
4. Select **Node.js** and version **4.x or later**
5. Copy the connection string - it will look like:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
   ```

## Step 6: Update Your Backend .env

1. Open `backend/.env` in your editor
2. Replace the MONGODB_URI line:
   ```env
   MONGODB_URI=mongodb+srv://gameforge_user:YourPasswordHere@gameforge-cluster.mongodb.net/gameforge?retryWrites=true&w=majority
   ```
3. Replace:
   - `gameforge_user` with your username
   - `YourPasswordHere` with your password (URL encode special chars: `@` → `%40`, `:` → `%3A`, etc.)
   - `gameforge-cluster` with your cluster name

## Step 7: Test Your Connection

1. Start your backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Check console for:
   ```
   ✓ Connected to MongoDB
   ✓ Server running on http://localhost:5000
   ```

## Troubleshooting

### Connection String Error
- Make sure username and password are correct (copy from MongoDB Atlas)
- Check if your IP is whitelisted in Network Access
- Special characters in password need URL encoding
- If you see `ETIMEDOUT`, Atlas is reachable but your current IP is not allowed yet

### Authentication Failed
- Verify the username and password match what you created
- Check that the user has `readWriteAnyDatabase` role

### Cluster Not Responding
- Wait a few minutes after cluster creation
- Check your internet connection
- Verify network access rules (should allow 0.0.0.0/0 for development)

## Security Notes for Production

Before deploying to production:

1. **Strong Password**: Use a complex password with uppercase, lowercase, numbers, and symbols
2. **Restrict IPs**: Replace `0.0.0.0/0` with your specific server IP in Network Access
3. **Create Specific User**: Create database-specific users (not admin)
4. **Enable Encryption**: Enable encrypted connections (enabled by default)
5. **Use Environment Variables**: Never commit passwords to git - use `.env` files and add to `.gitignore`
6. **Backup Strategy**: Enable automated backups in your cluster settings

## Next Steps

Once your connection works:
- Your backend will automatically create collections when data is inserted
- You can view data in MongoDB Atlas under the **Collections** tab
- Ready to deploy your app!
