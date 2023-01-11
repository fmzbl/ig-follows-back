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
  const usersHtml = users.reduce((htmlStr, user) => {
    return (
      htmlStr +
      `<li><a target="_blank" href="https://www.instagram.com/${user}">${user}<a/></li>`
    );
  }, "");

  let html = `<h1 style="font-family: 'helvetica'; margin-bottom: 20px;">This users don't follow you back :(</h1>
<ol style="font-family: 'helvetica';">
    ${usersHtml}
<ol>`;

  return html;
}

getUsers(config.following).then((following) => {
  getUsers(config.followers).then((followers) => {
    const notFollowingMeBack = following.filter((f) => {
      return !followers.includes(f);
    });

    const html = genNotFollowingBackHTML(notFollowingMeBack);

    window.document.querySelector("html").innerHTML =
      "<html><body></body></html>";
    window.document.body.innerHTML = html;
  });
});
