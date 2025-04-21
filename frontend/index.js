const API_URL = 'http://localhost:5001/api/posts';
let page = 1;
const postsPerPage = 6;

document.addEventListener('DOMContentLoaded', () => {
  fetchPosts();
  document.getElementById('nav-home').addEventListener('click', () => showSection('home'));
  document.getElementById('nav-about').addEventListener('click', () => showSection('about'));
  document.getElementById('nav-services').addEventListener('click', () => showSection('services'));
  document.getElementById('nav-profile').addEventListener('click', () => showSection('profile'));
  document.getElementById('load-more').addEventListener('click', () => {
    page++;
    fetchPosts(true); // Append mode
  });
});

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(sectionId).classList.add('active');
  if (sectionId === 'home') fetchPosts();
}

async function fetchPosts(append = false) {
  try {
    const response = await fetch(`${API_URL}?page=${page}&limit=${postsPerPage}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
    }
    const posts = await response.json();
    const postsDiv = document.getElementById('posts');
    if (!append) postsDiv.innerHTML = '';
    if (posts.length === 0 && !append) {
      postsDiv.innerHTML = '<p>No posts yet.</p>';
    } else {
      posts.forEach(post => {
        const postEl = document.createElement('div');
        postEl.className = 'post';
        postEl.innerHTML = `
          <h3>${post.title}</h3>
          <p>${post.content}</p>
          <small>Posted on: ${new Date(post.date).toLocaleDateString()}</small>
          <button onclick="deletePost('${post._id}')" class="delete-btn">Delete</button>
        `;
        postsDiv.appendChild(postEl);
      });
      document.getElementById('load-more').style.display = posts.length < postsPerPage ? 'none' : 'block';
    }
  } catch (error) {
    console.error('Fetch error:', error);
    alert(`Error fetching posts: ${error.message}`);
  }
}

async function createPost(event) {
  event.preventDefault();
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();

  if (!title || !content) {
    alert('Please fill in both title and content');
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    if (!response.ok) throw new Error('Failed to create post');
    document.getElementById('title').value = '';
    document.getElementById('content').value = '';
    page = 1; // Reset to first page
    fetchPosts();
    showSection('home');
  } catch (error) {
    console.error(error);
    alert('Error creating post');
  }
}

async function deletePost(postId) {
  try {
    const response = await fetch(`${API_URL}/${postId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete post');
    page = 1; // Reset to first page
    fetchPosts();
  } catch (error) {
    console.error(error);
    alert('Error deleting post');
  }
}



