# johannes
johannes is a dead-simple blog backend that uses Google Sheets and Google Drive as a real-time Content Management System (CMS).

## How it Works

Posts are automatically pushed to a Supabase database which serves a blog deployed on Heroku.

Google Drive keeps the posts in sync on the database via a Google Apps Script that checks for updated files in the drive every (5) minutes.

This is a simple and effective demonstration of localized control over pieces of infrastructure supporting a personal blog. johannes emphasizes complete custody over blog data and zero-config interfaces (like plain text in Google Docs) over platform-dependent solutions like Squarespace or Wix. 

## Going Further
johannes could be extended such that users could define and configure their own database. We could also explore using another service for the CMS component. For example we could build a lightweight daemon that runs on a user's machine and performs the same sync and push behavior to the johannes backend.

Breaking the reliance on major platforms, makes johannes blogs more resilient in the face of concerning changes to the platform providers (I'm looking at you WordPress...) and starts users on the path of making the blog truly personal again.



