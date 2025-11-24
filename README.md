參考這篇[文章](https://javascript.plainenglish.io/this-one-abstraction-made-my-frontend-10x-more-maintainable-deea6b95252c)實作 todo list 功能。

## why

### 1. 使用 event stream 

Most developers add it all into the button handler

This function knows too much. It’s coupled to everything. Changing the notification system means chances to add a bug every place it’s called.

Sound familiar? This simple thing can turn any web application into a web of spaghetti code.

```js
// ❌ bad

function handleDelete(listingId) {
    showConfirmModal();
    makeDeleteRequest(listingId);
    refreshListingsTable();
    showSuccessToast();
    trackAnalyticsEvent();
    updateUserPermissions();
}
```

```js
// ✅
import { appEvents } from "./app-events";

// Somewhere in your code, broadcast success
appEvents.emit("notification:show", {
    type: "success",
    message: "Listing updated.",
});

// In a completely separate module, listen and react
appEvents.on("notification:show", (data) => {
    console.log(`Showing ${data.type}: ${data.message}`);
});
```