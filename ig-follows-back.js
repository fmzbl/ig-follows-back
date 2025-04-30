function getInstagramTokens() {
  const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1];

  const lsd = document.documentElement.innerHTML.match(
    /"LSD",\[\],\{"token":"([^"]+)"\}/
  )?.[1];

  const fb_dtsg =
    document.querySelector('input[name="fb_dtsg"]')?.value ||
    JSON.parse(document.querySelector('#__eqmc')?.textContent || '{}')?.f;

  if (!csrfToken || !lsd || !fb_dtsg) {
    throw new Error("Missing one or more required tokens");
  }

  return { csrfToken, lsd, fb_dtsg };
}

async function sendUnfollowRequest({ userId, tokens, refererUsername }) {
  const { csrfToken, lsd, fb_dtsg } = tokens;

  const variables = JSON.stringify({
    target_user_id: userId,
    container_module: "profile",
    nav_chain: "PolarisFeedRoot:feedPage:13:topnav-link,PolarisProfilePostsTabRoot:profilePage:14:unexpected"
  });

  const body = new URLSearchParams({
    av: "0",
    __d: "www",
    __user: "0",
    __a: "1",
    __req: "50",
    __hs: "20207.HYP:instagram_web_pkg.2.1...1",
    dpr: "1",
    __ccg: "EXCELLENT",
    __rev: "1022349207",
    __s: "63izop:teomww:q2si65",
    __hsi: "7498878060290334796",
    __dyn: "7xeUjG1mxu1syUbFp41twpUnwgU7SbzEdF8aUco2qwJxS0DU6u3y4o0B-q1ew6ywaq0yE462mcw5Mx62G5UswoEcE7O2l0Fwqo31w9a9wtUd8-U2zxe2GewGw9a361qwuEjUlwhEe87q0oa2-azqwt8d-2u2J08O321LwTwKG1pg2fwxyo6O1FwlA3a3zhA6bwIxeUnAwCAxW1oxe6UaU3cyUC4o16Usw",
    __csr: "static_if_needed",
    __comet_req: "7",
    fb_dtsg,
    jazoest: "26201",
    lsd,
    __spin_r: "1022349207",
    __spin_b: "trunk",
    __spin_t: "1745968605",
    __crn: "comet.igweb.PolarisProfilePostsTabRoute",
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: "usePolarisUnfollowMutation",
    variables,
    server_timestamps: "true",
    doc_id: "25474677615509423"
  });

  const headers = {
    "User-Agent": navigator.userAgent,
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Content-Type": "application/x-www-form-urlencoded",
    "X-FB-Friendly-Name": "usePolarisUnfollowMutation",
    "X-BLOKS-VERSION-ID": "446750d9733aca29094b1f0c8494a768d5742385af7ba20c3e67c9afb91391d8",
    "X-CSRFToken": csrfToken,
    "X-IG-App-ID": "936619743392459",
    "X-Root-Field-Name": "xdt_destroy_friendship",
    "X-FB-LSD": lsd,
    "X-ASBD-ID": "359341",
    "Alt-Used": "www.instagram.com",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Priority": "u=0"
  };

  const response = await fetch("https://www.instagram.com/graphql/query", {
    method: "POST",
    headers,
    credentials: "include",
    referrer: `https://www.instagram.com/${refererUsername}/`,
    body: body.toString(),
    mode: "cors"
  });

  const json = await response.json();
  if (response.ok && !json.errors) {
    console.log(`Unfollowed user ID ${userId} successfully`);
  } else {
    console.error("Unfollow failed:", json.errors || json);
  }

  return json;
}

async function unfollowByUsername(username, tokens) {
  const res = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
    {
      headers: {
        "X-CSRFToken": tokens.csrfToken,
        "X-IG-App-ID": "936619743392459"
      },
      credentials: "include"
    }
  );

  const data = await res.json();
  const userId = data?.data?.user?.id;

  if (!userId) {
    throw new Error(`Could not resolve ID for ${username}`);
  }

  return await sendUnfollowRequest({
    userId,
    tokens,
    refererUsername: username
  });
}


// Run this script in your profile page: https://www.instagram.com/<username>
function getUserIdFromUrl() {
  const username = window.location.pathname.replaceAll("/", "");

  const req = new XMLHttpRequest();
  req.open(
    "GET",
    `https://www.instagram.com/web/search/topsearch/?query=@${username}`,
    false
  );
  req.send();

  if (req.status == 200) {
    const data = JSON.parse(req.responseText);
    let userId = 0;
    data.users.forEach((user) => {
      if (user.user.username === username) {
        userId = parseInt(user.user.pk);
      }
    });
    return userId;
  }
}

const options = {
  userId: getUserIdFromUrl(),
};

const config = {
  followers: {
    hash: "c76146de99bb02f6415203be841dd25a",
    path: "edge_followed_by",
  },
  following: {
    hash: "d04b0a864b4b54837c0d870b0e77e076",
    path: "edge_follow",
  },
};

function getUsers(config) {
  var allUsers = [];

  function getUsernames(data) {
    var userBatch = data.map((element) => element.node.username);
    allUsers.push(...userBatch);
  }

  return new Promise((resolve, _reject) => {
    // From here: https://stackoverflow.com/questions/32407851/instagram-api-how-can-i-retrieve-the-list-of-people-a-user-is-following-on-ins
    async function makeNextRequest(nextCurser, listConfig) {
      var params = {
        id: options.userId,
        include_reel: true,
        fetch_mutual: true,
        first: 50,
      };
      if (nextCurser) {
        params.after = nextCurser;
      }
      var requestUrl =
        `https://www.instagram.com/graphql/query/?query_hash=` +
        listConfig.hash +
        `&variables=` +
        encodeURIComponent(JSON.stringify(params));

      var xhr = new XMLHttpRequest();
      xhr.onload = function (e) {
        var res = JSON.parse(xhr.response);

        var userData = res.data.user[listConfig.path].edges;
        getUsernames(userData);

        var curser = "";
        try {
          curser = res.data.user[listConfig.path].page_info.end_cursor;
        } catch {}

        if (curser) {
          makeNextRequest(curser, listConfig);
        } else {
          return resolve(allUsers);
        }
      };

      xhr.open("GET", requestUrl);
      xhr.send();
    }
    makeNextRequest("", config);
  });
}

function genNotFollowingBackHTML(users) {
  const usersHtml = users.reduce((htmlStr, user, index) => {
    return (
      htmlStr +
      `<li style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
        <span style="width: 24px; flex-shrink: 0;">${index + 1}.</span>
        <a href="https://www.instagram.com/${user}" target="_blank" style="flex-grow: 1; color: #00376b; text-decoration: none;">${user}</a>
        <button data-username="${user}" style="flex-shrink: 0;">Unfollow</button>
        <span id="status-${user}" style="width: 100px; font-size: 13px; color: gray;"></span>
      </li>`
    );
  }, "");

    const style = document.createElement("style");
    style.textContent = `
    a {
	color: #00376b;
	text-decoration: none;
    }
    a:hover {
	text-decoration: underline;
    }
    button {
	padding: 2px 8px;
	font-size: 13px;
    }
    `;
    document.head.appendChild(style);


  return `
    <div style="font-family: Helvetica, sans-serif; max-width: 600px; margin: 40px auto;">
      <h2 style="margin-bottom: 20px;">These users don't follow you back :(</h2>
      <ol style="list-style: none; padding: 0; margin: 0;">
        ${usersHtml}
      </ol>
    </div>
  `;
}

getUsers(config.following).then((following) => {
  getUsers(config.followers).then((followers) => {
    const tokens = getInstagramTokens(); // extract BEFORE DOM is replaced
    const notFollowingMeBack = following.filter((f) => {
      return !followers.includes(f);
    });

    const html = genNotFollowingBackHTML(notFollowingMeBack);

    document.documentElement.innerHTML = "<html><body></body></html>";
    document.body.innerHTML = html;

    document.querySelectorAll("button[data-username]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const username = btn.getAttribute("data-username");
        const statusEl = document.getElementById(`status-${username}`);
        statusEl.textContent = "Unfollowing...";
        statusEl.style.color = "gray";

        try {
          await unfollowByUsername(username, tokens);
          statusEl.textContent = "Unfollowed";
          statusEl.style.color = "green";
          btn.disabled = true;
        } catch (e) {
          console.error("Error unfollowing", username, e);
          statusEl.textContent = "Error";
          statusEl.style.color = "red";
        }
      });
    });
  });
});

