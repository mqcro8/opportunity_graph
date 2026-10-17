# Opportunity Graph

**Find educational opportunities that fit you.**

Opportunity Graph is a free platform that helps students discover scholarships, hackathons, research programs, internships, competitions, and other educational opportunities in one place. It matches opportunities to each student's profile and explains why each one is recommended.

## The Problem

When I was in high school, I wanted to participate in hackathons, competitions, scholarships, and summer programs that would help me learn, meet people, and challenge myself.

The problem wasn't motivation. It was discovery.

Information was scattered across university websites, organization pages, Discord servers, newsletters, and social media. Sometimes, I discovered an opportunity that was a perfect fit only after its application deadline had passed.

I kept thinking there had to be a better way to find these opportunities before it was too late.

Opportunity Graph is my attempt to build the platform I wish I had back then.

## How It Works

Students create a profile based on their interests, skills, goals, and academic background. Opportunity Graph uses this information to rank available opportunities according to how well they match each student.

Rather than relying on an opaque AI recommendation model, the platform uses a deterministic scoring algorithm to make its recommendations more transparent.

The scoring system considers:

- **Interest match:** How closely an opportunity aligns with a student's interests.
- **Eligibility:** How well the opportunity's eligibility criteria align with the student's profile.
- **Application deadline:** The timing of the opportunity's application window.
- **Experience level:** Whether the opportunity aligns with the student's experience.
- **Popularity:** A factor considered by the recommendation algorithm.

Each recommendation includes a match score and an explanation of why the opportunity appeared in the results, helping students understand the reasoning behind their matches.

## Where AI Fits In

AI is used where it can reduce manual work: extracting structured information from official opportunity pages.

The extracted information is reviewed before an opportunity becomes visible to students. This helps streamline data collection while keeping accuracy and human oversight part of the process.

The distinction is intentional:

- **AI-assisted extraction** helps turn information from opportunity pages into structured data.
- **Deterministic matching** ranks opportunities against student profiles using defined scoring logic.
- **Explainable recommendations** help students understand why an opportunity matches their interests and profile.

The goal isn't to use AI everywhere. It's to use it where it adds practical value.

## Built With

- **Next.js** for the web application.
- **TypeScript** for application development.
- **Supabase** for the backend and data infrastructure.
- **AI-assisted information extraction** to help structure opportunity data.
- **A deterministic recommendation algorithm** to score and explain matches.

## Designed Around Students

Opportunity Graph is designed to make discovering opportunities easier, not to replace the organizations that offer them.

The platform brings opportunities together in one place and helps students identify relevant options. Students should always verify application deadlines, eligibility requirements, and other details on the official organizer's website before applying, since published information can change.

## The Goal

A student's access to opportunities shouldn't depend entirely on knowing which websites to visit, which organizations to follow, or which communities to join.

Opportunity Graph aims to make educational opportunities easier to discover, understand, and act on.

**Less time searching. More time learning, building, and participating.**
