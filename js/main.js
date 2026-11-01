(function () {
  "use strict";

  let lastCopiedText = null;
  let lastCopiedSpan = null;

  /* =====================================================
     CONFIGURATION

  /* =====================================================
     CONFIGURATION
  ===================================================== */
  const CONFIG = {
    STORAGE_KEY: "agh-book-progress",
    TASK_ORDER: [
      "task1",
      "task2",
      "task3",
      "task4",
      "task5",
      "task6",
      "task7",
      "task8",
      "task9",
      "task10",
      "task11",
      "task12",
      "task13",
      "task14",
      "task15",
      "task16",
      "task17",
      "task18",
      "task19",
      "task20",
      "task21",
      "task22",
      "task23",
      "task24",
      "task25",
      "task26",
      "task27",
      "task28",
      "task29",
      "task30",
      "task31",
      "task32",
      "task33",
      "task34",
      "task35",
      "task36",
      "task37",
      "task38",
      "task39",
      "task40",
      "task41",
      "task42",
      "task43",
      "task44",
      "task45",
      "task46",
      "task47",
      "task48",
      "task49",
      "task50",
    ],
    DEBUG: true,
    RESULT_IMAGES: {
      correct: "img/correct.png",
      wrong: "img/wrong.png",
    },
    SIMILARITY_THRESHOLD: 0.75, // For fuzzy matching (0.0 to 1.0)
  };

  /* =====================================================
    ADD CLOUDINARY CONFIG AT TOP
    ===================================================== */
  const CloudinaryUploader = {
    CLOUD_NAME: "dpgg0a6de",
    UPLOAD_PRESET: "agh_ai_images",

    COMPRESSION_OPTIONS: {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
      quality: 0.7,
      fileType: "image/jpeg",
    },

    async compressImage(base64Data) {
      try {
        Logger.log("Compressing image...");
        const response = await fetch(base64Data);
        const blob = await response.blob();
        Logger.log(
          "Original size:",
          (blob.size / 1024 / 1024).toFixed(2) + "MB",
        );

        const compressedFile = await imageCompression(
          blob,
          this.COMPRESSION_OPTIONS,
        );
        Logger.success(
          "Compressed size:",
          (compressedFile.size / 1024 / 1024).toFixed(2) + "MB",
        );

        const compressedBase64 = await this.fileToBase64(compressedFile);
        return compressedBase64;
      } catch (error) {
        Logger.error("Compression failed:", error);
        return base64Data;
      }
    },

    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },

    async uploadImage(base64Data) {
      try {
        const compressedBase64 = await this.compressImage(base64Data);
        const formData = new FormData();
        formData.append("file", compressedBase64);
        formData.append("upload_preset", this.UPLOAD_PRESET);

        Logger.log("Uploading to Cloudinary...");
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/upload`,
          { method: "POST", body: formData },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Upload failed");
        }

        const data = await response.json();
        Logger.success("Uploaded to Cloudinary:", data.secure_url);
        return data.secure_url;
      } catch (error) {
        Logger.error("Cloudinary upload failed:", error);
        return null;
      }
    },
  };

  /* =====================================================
     LOGGER UTILITY
  ===================================================== */
  const Logger = {
    log(message, data = null) {
      if (!CONFIG.DEBUG) return;
      console.log(`📘 ${message}`, data || "");
    },

    success(message, data = null) {
      if (!CONFIG.DEBUG) return;
      console.log(`✅ ${message}`, data || "");
    },

    error(message, data = null) {
      console.error(`❌ ${message}`, data || "");
    },

    warn(message, data = null) {
      if (!CONFIG.DEBUG) return;
      console.warn(`⚠️ ${message}`, data || "");
    },

    separator() {
      if (!CONFIG.DEBUG) return;
      console.log("=".repeat(60));
    },
  };

  /* =====================================================
     DOM UTILITIES
  ===================================================== */
  const DOM = {
    select: (selector, context = document) => context.querySelector(selector),
    selectAll: (selector, context = document) =>
      Array.from(context.querySelectorAll(selector)),
    normalize: (str) => str.trim().toLowerCase(),
  };

  /* =====================================================
     STRING SIMILARITY UTILITIES
  ===================================================== */
  const StringUtils = {
    // Calculate similarity between two strings (0 to 1)
    similarity(str1, str2) {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;

      if (longer.length === 0) return 1.0;

      const editDistance = this.levenshteinDistance(longer, shorter);
      return (longer.length - editDistance) / longer.length;
    },

    // Levenshtein distance algorithm
    levenshteinDistance(str1, str2) {
      const matrix = [];

      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }

      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1, // substitution
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1, // deletion
            );
          }
        }
      }

      return matrix[str2.length][str1.length];
    },

    // Check if two words are similar
    areSimilar(word1, word2, threshold = CONFIG.SIMILARITY_THRESHOLD) {
      word1 = word1.toLowerCase().trim();
      word2 = word2.toLowerCase().trim();

      // Exact match
      if (word1 === word2) return true;

      // One contains the other
      if (word1.includes(word2) || word2.includes(word1)) {
        const minLength = Math.min(word1.length, word2.length);
        return minLength >= 3;
      }

      // Fuzzy match
      const similarity = this.similarity(word1, word2);

      if (CONFIG.DEBUG && similarity >= threshold - 0.1) {
        Logger.log(
          `Similarity: "${word1}" vs "${word2}" = ${(similarity * 100).toFixed(0)}%`,
        );
      }

      return similarity >= threshold;
    },

    // Check if user answer matches any word in correct answer
    matchesAnyWord(
      userAnswer,
      correctAnswer,
      threshold = CONFIG.SIMILARITY_THRESHOLD,
    ) {
      const correctWords = correctAnswer
        .split(/[\s,]+/)
        .filter((w) => w.length > 0)
        .map((w) => w.toLowerCase().trim());

      const userWords = userAnswer
        .split(/[\s,]+/)
        .filter((w) => w.length > 0)
        .map((w) => w.toLowerCase().trim());

      for (const userWord of userWords) {
        for (const correctWord of correctWords) {
          if (this.areSimilar(userWord, correctWord, threshold)) {
            Logger.log(`✓ Match: "${userWord}" ≈ "${correctWord}"`);
            return true;
          }
        }
      }

      return false;
    },
  };

  /* =====================================================
     STORAGE MANAGER
  ===================================================== */
  const StorageManager = {
    getProgress() {
      try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        return stored ? JSON.parse(stored) : this.getDefaultProgress();
      } catch (e) {
        Logger.error("Failed to load progress", e);
        return this.getDefaultProgress();
      }
    },

    getDefaultProgress() {
      return {
        completedTasks: [],
        taskData: {},
        lastPage: 1,
        timestamp: Date.now(),
      };
    },

    saveProgress(data) {
      try {
        data.timestamp = Date.now();
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
        Logger.success("Progress saved", {
          completed: data.completedTasks.length,
          tasks: data.completedTasks,
        });
      } catch (e) {
        Logger.error("Failed to save progress", e);
      }
    },

    markTaskComplete(taskId) {
      const progress = this.getProgress();

      if (!progress.completedTasks.includes(taskId)) {
        progress.completedTasks.push(taskId);
        this.saveProgress(progress);
        Logger.success(`Task "${taskId}" completed!`);
      }
    },

    isTaskComplete(taskId) {
      const progress = this.getProgress();
      return progress.completedTasks.includes(taskId);
    },

    saveTaskData(taskId, data) {
      const progress = this.getProgress();
      progress.taskData[taskId] = data;
      this.saveProgress(progress);
    },

    getTaskData(taskId) {
      const progress = this.getProgress();
      return progress.taskData[taskId] || null;
    },

    reset() {
      localStorage.removeItem(CONFIG.STORAGE_KEY);
      Logger.warn("All progress cleared!");
    },
  };

  /* =====================================================
     NAVIGATION MANAGER
  ===================================================== */
  const NavigationManager = {
    isUpdating: false,

    init() {
      Logger.log("Initializing Navigation Manager...");
      this.setupNavigationButtons();
      this.bindTurnJsEvents();
    },

    setupNavigationButtons() {
      const prevBtn = DOM.select("#prev-btn");
      const nextBtn = DOM.select("#next-btn");

      if (!prevBtn || !nextBtn) {
        Logger.warn("Navigation buttons not found in DOM");
        return;
      }

      prevBtn.addEventListener("click", () => this.navigatePrevious());
      nextBtn.addEventListener("click", () => this.navigateNext());
    },

    bindTurnJsEvents() {
      $(document).ready(() => {
        const flipbook = $("#flipbook");

        flipbook.bind("turned", () => {
          this.updateButtonStates();
        });

        this.updateButtonStates();
      });
    },

    navigatePrevious() {
      const flipbook = $("#flipbook");
      const currentPage = flipbook.turn("page");

      if (currentPage > 1) {
        flipbook.turn("previous");
        Logger.log("Navigated to previous page");
      }
    },

    navigateNext() {
      const flipbook = $("#flipbook");
      const currentPage = flipbook.turn("page");
      const totalPages = flipbook.turn("pages");

      if (currentPage < totalPages) {
        const nextPage = currentPage + 1;

        if (!PageLockManager.isPageLocked(nextPage)) {
          flipbook.turn("next");
          Logger.log("Navigated to next page");
        } else {
          Logger.warn(`Page ${nextPage} is locked`);
          PageLockManager.showLockedMessage();
        }
      }
    },

    // updateButtonStates() {
    //   if (this.isUpdating) return;
    //   this.isUpdating = true;

    //   try {
    //     const flipbook = $("#flipbook");
    //     if (!flipbook.turn) return;

    //     const currentPage = flipbook.turn("page");
    //     const totalPages = flipbook.turn("pages");

    //     const prevBtn = DOM.select("#prev-btn");
    //     const nextBtn = DOM.select("#next-btn");

    //     if (!prevBtn || !nextBtn) return;

    //     prevBtn.disabled = currentPage <= 1;

    //     // const nextPage = currentPage + 1;
    //     // const isNextLocked = PageLockManager.isPageLocked(nextPage);
    //     // nextBtn.disabled = currentPage >= totalPages || isNextLocked;
    //     const nextPage = currentPage + 1;

    //     // Simulate Turn.js spread
    //     const view = flipbook.turn("view", nextPage) || [nextPage];

    //     const isNextLocked = view.every((p) => PageLockManager.isPageLocked(p));

    //     nextBtn.disabled = currentPage >= totalPages || isNextLocked;
    //   } finally {
    //     this.isUpdating = false;
    //   }
    // },

    updateButtonStates() {
      if (this.isUpdating) return;
      this.isUpdating = true;

      try {
        const flipbook = $("#flipbook");
        if (!flipbook.turn) return;

        const currentPage = flipbook.turn("page");
        const totalPages = flipbook.turn("pages");

        const prevBtn = DOM.select("#prev-btn");
        const nextBtn = DOM.select("#next-btn");

        if (!prevBtn || !nextBtn) return;

        prevBtn.disabled = currentPage <= 1;

        // FIXED: Check if the NEXT SPREAD is locked
        const nextPage = currentPage + 1;
        const nextView = flipbook.turn("view", nextPage) || [nextPage];

        const isNextLocked = PageLockManager.isSpreadLocked(nextView);
        nextBtn.disabled = currentPage >= totalPages || isNextLocked;
      } finally {
        this.isUpdating = false;
      }
    },
  };

  /* =====================================================
     PAGE LOCK MANAGER
  ===================================================== */

  // const PageLockManager = (function () {
  //   /* ================================
  //      PRIVATE HELPERS
  //   ================================ */

  //   function getPageEl(pageNum) {
  //     return document.querySelector(`.page.p${pageNum}`);
  //   }

  //   function isFreePage(pageNum) {
  //     const page = getPageEl(pageNum);
  //     return page?.dataset.free === "true";
  //   }

  //   function getTaskId(pageNum) {
  //     const page = getPageEl(pageNum);
  //     return page?.dataset.taskId || null;
  //   }

  //   function getNextAvailableTask() {
  //     for (const taskId of CONFIG.TASK_ORDER) {
  //       if (!StorageManager.isTaskComplete(taskId)) {
  //         return taskId;
  //       }
  //     }
  //     return null;
  //   }

  //   function isNextTask(taskId) {
  //     return taskId === getNextAvailableTask();
  //   }

  //   /* ================================
  //      PUBLIC API
  //   ================================ */

  //   function isPageLocked(pageNum) {
  //     // 1️⃣ Free pages are always allowed
  //     if (isFreePage(pageNum)) return false;

  //     const taskId = getTaskId(pageNum);

  //     // 2️⃣ Pages without tasks are free
  //     if (!taskId) return false;

  //     // 3️⃣ Completed task pages are free
  //     if (StorageManager.isTaskComplete(taskId)) return false;

  //     // 4️⃣ Allow entry to NEXT task (task start / continuation)
  //     if (isNextTask(taskId)) return false;

  //     // 5️⃣ Everything else is locked
  //     return true;
  //   }

  //   function showLockedMessage() {
  //     UIFeedback.showToast(
  //       "Complete the current task to unlock this page",
  //       2200,
  //     );
  //   }

  //   function bindTurnJs() {
  //     const flipbook = $("#flipbook");

  //     // 🔒 Block page turning
  //     flipbook.bind("turning", function (e, page, view) {
  //       if (!view) return true;

  //       // Block ONLY if both pages are locked
  //       const blocked = view.every((p) => isPageLocked(p));

  //       if (blocked) {
  //         showLockedMessage();
  //         e.preventDefault();
  //         return false;
  //       }

  //       return true;
  //     });

  //     // 🔒 Block corner drag
  //     flipbook.bind("start", function (e, pageObj, corner) {
  //       if (!corner) return true;

  //       const current = flipbook.turn("page");
  //       const target =
  //         corner === "tl" || corner === "bl" ? current - 1 : current + 1;

  //       if (isPageLocked(target)) {
  //         showLockedMessage();
  //         e.preventDefault();
  //         return false;
  //       }

  //       return true;
  //     });
  //   }

  //   function bindKeyboard() {
  //     document.addEventListener("keydown", (e) => {
  //       const flipbook = $("#flipbook");
  //       const current = flipbook.turn("page");

  //       if (e.key === "ArrowRight") {
  //         const next = current + 1;
  //         if (isPageLocked(next)) {
  //           showLockedMessage();
  //           e.preventDefault();
  //         } else {
  //           flipbook.turn("next");
  //         }
  //       }

  //       if (e.key === "ArrowLeft") {
  //         flipbook.turn("previous");
  //       }
  //     });
  //   }

  //   function init() {
  //     bindTurnJs();
  //     bindKeyboard();

  //     if (CONFIG.DEBUG) {
  //       console.log("🔐 PageLockManager initialized");
  //     }
  //   }

  //   /* ================================
  //      EXPOSED METHODS
  //   ================================ */
  //   return {
  //     init,
  //     isPageLocked,
  //   };
  // })();

  const PageLockManager = (function () {
    /* ================================
     PRIVATE HELPERS
  ================================ */

    function getPageEl(pageNum) {
      if (pageNum <= 0) return null;
      return document.querySelector(`.page.p${pageNum}`);
    }

    function isFreePage(pageNum) {
      if (pageNum <= 0) return true;
      const page = getPageEl(pageNum);
      if (!page) return true;
      return page.dataset.free === "true";
    }

    function getTaskId(pageNum) {
      if (pageNum <= 0) return null;
      const page = getPageEl(pageNum);
      return page?.dataset.taskId || null;
    }

    function getNextAvailableTask() {
      for (const taskId of CONFIG.TASK_ORDER) {
        if (!StorageManager.isTaskComplete(taskId)) {
          return taskId;
        }
      }
      return null;
    }

    function isNextTask(taskId) {
      return taskId === getNextAvailableTask();
    }

    // NEW: Get the first page number for a given taskId
    function getFirstPageOfTask(taskId) {
      const pages = document.querySelectorAll(`[data-task-id="${taskId}"]`);
      if (pages.length === 0) return null;

      // Extract page number from class like "page p4"
      const firstPage = pages[0];
      const match = firstPage.className.match(/\bp(\d+)\b/);
      return match ? parseInt(match[1]) : null;
    }

    // NEW: Check if there are incomplete tasks before this page
    function hasIncompleteTasksBefore(pageNum) {
      const nextTask = getNextAvailableTask();
      if (!nextTask) return false; // All tasks complete

      const nextTaskFirstPage = getFirstPageOfTask(nextTask);
      if (!nextTaskFirstPage) return false;

      // If the next incomplete task starts BEFORE this page, block it
      const hasBlockingTask = nextTaskFirstPage < pageNum;

      if (hasBlockingTask) {
        console.log(
          `⚠️ Page ${pageNum} blocked by incomplete task "${nextTask}" at page ${nextTaskFirstPage}`,
        );
      }

      return hasBlockingTask;
    }

    /* ================================
     CORE LOGIC - FIXED WITH SEQUENTIAL CHECK
  ================================ */

    function isPageLocked(pageNum) {
      if (pageNum <= 0) {
        console.log(`📍 Page ${pageNum} → Invalid, treating as FREE`);
        return false;
      }

      // NEW: Check for incomplete tasks BEFORE this page
      if (hasIncompleteTasksBefore(pageNum)) {
        console.log(
          `📍 Page ${pageNum} → LOCKED (incomplete task blocks access)`,
        );
        return true;
      }

      // 1️⃣ Free pages are allowed (if no blocking tasks)
      if (isFreePage(pageNum)) {
        console.log(`📍 Page ${pageNum} → FREE (data-free="true")`);
        return false;
      }

      const taskId = getTaskId(pageNum);

      // 2️⃣ Pages without tasks are free
      if (!taskId) {
        console.log(`📍 Page ${pageNum} → FREE (no task-id)`);
        return false;
      }

      // 3️⃣ Completed task pages are free
      if (StorageManager.isTaskComplete(taskId)) {
        console.log(`📍 Page ${pageNum} → FREE (task "${taskId}" completed)`);
        return false;
      }

      // 4️⃣ Allow entry to NEXT task (task start / continuation)
      if (isNextTask(taskId)) {
        console.log(`📍 Page ${pageNum} → UNLOCKED (next task "${taskId}")`);
        return false;
      }

      // 5️⃣ Everything else is locked
      console.log(
        `📍 Page ${pageNum} → LOCKED (task "${taskId}" not accessible)`,
      );
      return true;
    }

    function isSpreadLocked(view) {
      if (!view || view.length === 0) return false;

      const validPages = view.filter((p) => p > 0);

      if (validPages.length === 0) {
        console.log(
          `🔓 Spread ${JSON.stringify(view)} → All invalid, allowing`,
        );
        return false;
      }

      const allLocked = validPages.every((pageNum) => isPageLocked(pageNum));

      console.log(
        `🔍 Spread check ${JSON.stringify(view)} → ${allLocked ? "LOCKED" : "UNLOCKED"}`,
      );

      return allLocked;
    }

    function showLockedMessage() {
      UIFeedback.showToast(
        "Complete the current task to unlock this page",
        2200,
      );
    }

    function bindTurnJs() {
      const flipbook = $("#flipbook");

      flipbook.bind("turning", function (e, page, view) {
        console.log(`🔄 Turning to page ${page}, view:`, view);

        if (!view) return true;

        const blocked = isSpreadLocked(view);

        if (blocked) {
          console.log(`❌ Navigation BLOCKED`);
          showLockedMessage();
          e.preventDefault();
          return false;
        }

        console.log(`✅ Navigation ALLOWED`);
        return true;
      });

      flipbook.bind("start", function (e, pageObj, corner) {
        if (!corner) return true;

        const current = flipbook.turn("page");
        let targetPage;

        if (corner === "tl" || corner === "bl") {
          targetPage = current - 1;
        } else {
          targetPage = current + 1;
        }

        console.log(`🖱️ Corner drag: from page ${current} to ${targetPage}`);

        const targetView = flipbook.turn("view", targetPage);

        if (isSpreadLocked(targetView)) {
          console.log(`❌ Corner drag BLOCKED`);
          showLockedMessage();
          e.preventDefault();
          return false;
        }

        console.log(`✅ Corner drag ALLOWED`);
        return true;
      });
    }

    function bindKeyboard() {
      document.addEventListener("keydown", (e) => {
        const flipbook = $("#flipbook");
        const current = flipbook.turn("page");

        if (e.key === "ArrowRight") {
          const next = current + 1;
          const nextView = flipbook.turn("view", next);

          console.log(
            `⌨️ Arrow Right: page ${current} → ${next}, view:`,
            nextView,
          );

          if (isSpreadLocked(nextView)) {
            showLockedMessage();
            e.preventDefault();
          } else {
            flipbook.turn("next");
          }
        }

        if (e.key === "ArrowLeft") {
          const prev = current - 1;
          const prevView = flipbook.turn("view", prev);

          console.log(
            `⌨️ Arrow Left: page ${current} → ${prev}, view:`,
            prevView,
          );

          if (isSpreadLocked(prevView)) {
            showLockedMessage();
            e.preventDefault();
          } else {
            flipbook.turn("previous");
          }
        }
      });
    }

    function init() {
      bindTurnJs();
      bindKeyboard();

      if (CONFIG.DEBUG) {
        console.log("🔐 PageLockManager initialized");
      }
    }

    return {
      init,
      isPageLocked,
      isSpreadLocked,
      showLockedMessage,
    };
  })();

  /* =====================================================
     UI FEEDBACK
  ===================================================== */
  const UIFeedback = {
    showResult(isCorrect) {
      const popup = DOM.select("#resultPopup");
      const box = DOM.select("#resultBox", popup);

      if (!popup || !box) return;

      // Clear and set image
      box.innerHTML = "";
      box.className = `result-box ${isCorrect ? "correct" : "wrong"}`;

      const img = document.createElement("img");
      img.src = isCorrect
        ? CONFIG.RESULT_IMAGES.correct
        : CONFIG.RESULT_IMAGES.wrong;
      img.alt = isCorrect ? "Correct" : "Wrong";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";

      box.appendChild(img);

      popup.classList.add("show");
      setTimeout(() => popup.classList.remove("show"), 1200);
    },

    showToast(message, duration = 2000) {
      const toast = document.getElementById("toast");
      if (toast) {
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), duration);
      }
    },

    clearValidationStates(taskPages) {
      const selectors = {
        ".ans-multi": ["correct", "wrong"],
        ".border": ["unanswered"],
        ".tile": ["correct", "wrong", "unanswered"],
        ".logic-card": ["correct", "wrong", "unanswered"],
        ".question": ["correct", "wrong", "unanswered"],
        ".editable": ["correct", "wrong"],
        ".paste-area": ["filled"],
      };

      taskPages.forEach((page) => {
        Object.entries(selectors).forEach(([selector, classes]) => {
          DOM.selectAll(selector, page).forEach((el) => {
            classes.forEach((cls) => el.classList.remove(cls));
          });
        });
      });
    },
  };

  /* =====================================================
   COPY FEEDBACK HELPER
===================================================== */
  function showCopiedBubble(target, text = "Copied") {
    const bubble = document.createElement("div");
    bubble.textContent = text;

    bubble.style.position = "absolute";
    bubble.style.background = "#222";
    bubble.style.color = "#fff";
    bubble.style.padding = "4px 8px";
    bubble.style.fontSize = "12px";
    bubble.style.borderRadius = "6px";
    bubble.style.pointerEvents = "none";
    bubble.style.zIndex = "9999";
    bubble.style.opacity = "0";
    bubble.style.transition = "opacity 0.2s ease, transform 0.2s ease";

    const rect = target.getBoundingClientRect();
    bubble.style.left = rect.left + window.scrollX + "px";
    bubble.style.top = rect.top + window.scrollY - 28 + "px";

    document.body.appendChild(bubble);

    // animate in
    requestAnimationFrame(() => {
      bubble.style.opacity = "1";
      bubble.style.transform = "translateY(-4px)";
    });

    setTimeout(() => {
      bubble.style.opacity = "0";
      bubble.style.transform = "translateY(0)";
      setTimeout(() => bubble.remove(), 200);
    }, 900);
  }

  /* =====================================================
     STATISTICS
  ===================================================== */
  const Statistics = {
    create() {
      return { total: 0, correct: 0, wrong: 0, unanswered: 0 };
    },

    log(taskType, stats) {
      Logger.log(`${taskType} Results:`, {
        total: stats.total,
        correct: stats.correct,
        wrong: stats.wrong,
        unanswered: stats.unanswered,
      });
    },

    isAllCorrect(stats) {
      return stats.correct === stats.total && stats.unanswered === 0;
    },
  };

  /* =====================================================
     VALIDATION HELPERS
  ===================================================== */
  const ValidationHelpers = {
    // Validate editable cells with fuzzy matching
    validateEditableCell(cell) {
      const correctAnswer = DOM.normalize(cell.dataset.answer);
      const userAnswer = DOM.normalize(cell.innerText || "");

      cell.classList.remove("correct", "wrong");

      // No answer required
      if (!correctAnswer) {
        cell.classList.add("correct");
        return { isCorrect: true, isEmpty: false };
      }

      // User didn't type anything
      if (!userAnswer) {
        cell.classList.add("wrong");
        return { isCorrect: false, isEmpty: true };
      }

      // Fuzzy matching
      const isMatch = StringUtils.matchesAnyWord(userAnswer, correctAnswer);

      if (isMatch) {
        cell.classList.add("correct");
        Logger.success(`Match: "${userAnswer}" ≈ "${correctAnswer}"`);
        return { isCorrect: true, isEmpty: false };
      } else {
        cell.classList.add("wrong");
        Logger.warn(`No match: "${userAnswer}" vs "${correctAnswer}"`);
        return { isCorrect: false, isEmpty: false };
      }
    },
  };

  /* =====================================================
     TASK VALIDATORS
  ===================================================== */
  const TaskValidators = {
    multiSelect(taskPages) {
      const stats = Statistics.create();

      taskPages.forEach((page) => {
        DOM.selectAll(".border[data-answer]", page).forEach((card) => {
          stats.total++;
          const correctAnswer = DOM.normalize(card.dataset.answer);
          const selected = DOM.select(".ans-multi.selected", card);

          if (!selected) {
            stats.unanswered++;
            card.classList.add("unanswered");
            return;
          }

          const userAnswer = DOM.normalize(selected.textContent);

          if (userAnswer === correctAnswer) {
            selected.classList.add("correct");
            stats.correct++;
          } else {
            selected.classList.add("wrong");
            stats.wrong++;
          }
        });
      });

      Statistics.log("Multi-Select", stats);
      return Statistics.isAllCorrect(stats);
    },

    tiles(taskPages) {
      const stats = Statistics.create();

      taskPages.forEach((page) => {
        DOM.selectAll(".tile[data-answer]", page).forEach((tile) => {
          stats.total++;
          const correctAnswer = DOM.normalize(tile.dataset.answer);
          const userAnswer = DOM.normalize(tile.dataset.matched || "");

          if (!userAnswer) {
            stats.unanswered++;
            tile.classList.add("unanswered");
          } else if (userAnswer === correctAnswer) {
            tile.classList.add("correct");
            stats.correct++;
          } else {
            tile.classList.add("wrong");
            stats.wrong++;
          }
        });
      });

      Statistics.log("Tiles", stats);
      return Statistics.isAllCorrect(stats);
    },

    select(taskPages) {
      const stats = Statistics.create();

      taskPages.forEach((page) => {
        DOM.selectAll(".logic-card[data-answer]", page).forEach((card) => {
          stats.total++;
          const correctAnswer = DOM.normalize(card.dataset.answer);
          const userAnswer = card.dataset.selected || "";

          if (!userAnswer) {
            stats.unanswered++;
            card.classList.add("unanswered");
          } else if (userAnswer === correctAnswer) {
            card.classList.add("correct");
            stats.correct++;
          } else {
            card.classList.add("wrong");
            stats.wrong++;
          }
        });
      });

      Statistics.log("Select", stats);
      return Statistics.isAllCorrect(stats);
    },

    trueFalse(taskPages) {
      const stats = Statistics.create();

      taskPages.forEach((page) => {
        DOM.selectAll(".question[data-answer]", page).forEach((question) => {
          stats.total++;
          const radios = DOM.selectAll("input[type=radio]", question);
          const checked = radios.find((r) => r.checked);

          if (!checked) {
            stats.unanswered++;
            question.classList.add("unanswered");
            return;
          }

          const userAnswer = radios.indexOf(checked) === 0 ? "true" : "false";
          const correctAnswer = DOM.normalize(question.dataset.answer);

          if (userAnswer === correctAnswer) {
            question.classList.add("correct");
            stats.correct++;
          } else {
            question.classList.add("wrong");
            stats.wrong++;
          }
        });
      });

      Statistics.log("True/False", stats);
      return Statistics.isAllCorrect(stats);
    },

    // promptGenerator(taskPages) {
    //   const stats = Statistics.create();

    //   taskPages.forEach((page) => {
    //     DOM.selectAll(".editable[data-answer]", page).forEach((cell) => {
    //       stats.total++;
    //       const result = ValidationHelpers.validateEditableCell(cell);

    //       if (result.isEmpty) {
    //         stats.unanswered++;
    //       } else if (result.isCorrect) {
    //         stats.correct++;
    //       } else {
    //         stats.wrong++;
    //       }
    //     });
    //   });

    //   Statistics.log("Prompt Generator", stats);
    //   return Statistics.isAllCorrect(stats);
    // },

    //     promptGenerator(taskPages) {
    //   const stats = Statistics.create();

    //   taskPages.forEach((page) => {
    //     DOM.selectAll(".editable[data-answer]", page).forEach((cell) => {
    //       stats.total++;

    //       // Get user's input
    //       const userAnswer = (cell.innerText || "").trim();

    //       // Remove old validation classes
    //       cell.classList.remove("correct", "wrong");

    //       // NEW LOGIC: Any non-empty text is correct
    //       if (userAnswer) {
    //         cell.classList.add("correct");
    //         stats.correct++;
    //       } else {
    //         // Empty = unanswered
    //         stats.unanswered++;
    //       }
    //     });
    //   });

    //   Statistics.log("Prompt Generator", stats);
    //   return Statistics.isAllCorrect(stats);
    // },

    promptGenerator(taskPages) {
      const stats = Statistics.create();

      taskPages.forEach((page) => {
        DOM.selectAll(".editable[data-answer]", page).forEach((cell) => {
          stats.total++;

          const correctAnswer = (cell.dataset.answer || "").trim();
          const userAnswer = (cell.innerText || "").trim();

          cell.classList.remove("correct", "wrong");

          if (!correctAnswer) {
            cell.classList.add("correct");
            stats.correct++;
            return;
          }

          if (!userAnswer) {
            stats.unanswered++;
            return;
          }

          const userAnswerLower = userAnswer.toLowerCase();
          const correctAnswerLower = correctAnswer.toLowerCase();

          let isCorrect = false;

          if (correctAnswer.includes(",")) {
            // ALL correct words must be present in user answer
            const allCorrectWords = correctAnswer
              .split(",")
              .map((ans) => ans.trim().toLowerCase())
              .filter((ans) => ans.length > 0)
              .flatMap((ans) => ans.split(/\s+/).filter((w) => w.length > 0));

            const userWords = userAnswerLower
              .split(/[\s,]+/)
              .filter((w) => w.length > 0);

            isCorrect = allCorrectWords.every((correctWord) => {
              return userWords.some((userWord) => {
                return StringUtils.areSimilar(correctWord, userWord);
              });
            });

            if (isCorrect) {
              Logger.success(
                `Match: "${userAnswer}" matched one complete option from: ${correctAnswer}`,
              );
            } else {
              Logger.warn(
                `No match: "${userAnswer}" vs options: ${correctAnswer}`,
              );
            }
          } else {
            const correctWords = correctAnswerLower
              .split(/\s+/)
              .filter((w) => w.length > 0);
            const userWords = userAnswerLower
              .split(/\s+/)
              .filter((w) => w.length > 0);

            const allWordsPresent = correctWords.every((correctWord) => {
              return userWords.some((userWord) => {
                return StringUtils.areSimilar(correctWord, userWord);
              });
            });

            isCorrect = allWordsPresent;

            if (isCorrect) {
              Logger.success(
                `Match: "${userAnswer}" contains all required words from "${correctAnswer}"`,
              );
            } else {
              Logger.warn(
                `No match: "${userAnswer}" missing words from "${correctAnswer}"`,
              );
            }
          }

          if (isCorrect) {
            cell.classList.add("correct");
            stats.correct++;
          } else {
            cell.classList.add("wrong");
            stats.wrong++;
          }
        });
      });

      Statistics.log("Prompt Generator", stats);

      // MODULAR SOLUTION: Show Copy Prompt button using CLASS selector
      if (Statistics.isAllCorrect(stats)) {
        taskPages.forEach((page) => {
          const copyBtn = DOM.select(".copyPromptBtn", page); // CHANGED to class
          if (copyBtn) {
            copyBtn.style.display = "block";
            Logger.success(`Copy Prompt button shown for ${page.className}`);
          }
        });
      }

      return Statistics.isAllCorrect(stats);
    },

    imagePasteSubmit(taskPages) {
      const stats = Statistics.create();
      let hasChatLink = false;

      taskPages.forEach((page) => {
        const promptArea = DOM.select(".prompt-area", page);
        if (promptArea) {
          stats.total++;
          const linkText = (promptArea.dataset.pastedText || "").trim();

          // Check if it's a valid URL and contains chatgpt or gemini
          if (linkText && this.isValidChatLink(linkText)) {
            hasChatLink = true;
            stats.correct++;
            Logger.log("✓ Valid chat link submitted:", linkText);
          } else if (linkText) {
            stats.wrong++;
            Logger.warn("✗ Invalid chat link (must be ChatGPT or Gemini)");
          } else {
            stats.unanswered++;
            Logger.warn("✗ Chat link not submitted");
          }
        }
      });

      Statistics.log("Chat Link Submit", stats);

      const isValid =
        hasChatLink && stats.unanswered === 0 && stats.wrong === 0;

      if (!isValid) {
        if (stats.unanswered > 0) {
          UIFeedback.showToast("Please submit your AI chat link", 2500);
        } else if (stats.wrong > 0) {
          UIFeedback.showToast(
            "Please submit a valid ChatGPT or Gemini chat link",
            2500,
          );
        }
      }

      return isValid;
    },

    // ADD this new helper method right after imagePasteSubmit
    isValidChatLink(text) {
      const lowerText = text.toLowerCase();

      // Check if it's a URL
      const urlPattern =
        /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/i;

      // Check if it contains chatgpt or gemini domain
      const isChatGPT =
        lowerText.includes("chatgpt.com") ||
        lowerText.includes("chat.openai.com");
      const isGemini = lowerText.includes("gemini.google.com");

      return urlPattern.test(text) && (isChatGPT || isGemini);
    },
  };

  /* =====================================================
     PROMPT GENERATOR MODULE
  ===================================================== */
  const PromptGenerator = {
    buildPrompt(section) {
      const fields = {
        task: DOM.select("#taskInput", section),
        subject: DOM.select("#subjectInput", section),
        scene: DOM.select("#sceneInput", section),
        style: DOM.select("#styleInput", section),
        context: DOM.select("#contextInput", section),
        details: DOM.select("#detailsInput", section),
      };

      const values = {};
      for (const [key, element] of Object.entries(fields)) {
        values[key] = element ? (element.innerText || "").trim() : "";
      }

      if (!values.task) values.task = "Image";

      return `Task - ${values.task}
Subject - ${values.subject}
Scene - ${values.scene}
Style - ${values.style}
Context - ${values.context}
Details - ${values.details}`;
    },
  };

  /* =====================================================
     INTERACTION HANDLERS
  ===================================================== */
  const InteractionHandlers = {
    // Multi-Select
    handleMultiSelectClick(btn) {
      const card = btn.closest(".border");
      DOM.selectAll(".ans-multi", card).forEach((b) =>
        b.classList.remove("selected"),
      );
      btn.classList.add("selected");
    },

    // Tiles
    tileState: {
      selectedWord: null,
      map: new Map(),
    },

    handleTileWordClick(wordBtn) {
      const state = this.tileState;

      let usedTile = null;
      state.map.forEach((btn, tile) => {
        if (btn === wordBtn) usedTile = tile;
      });

      if (usedTile) {
        usedTile.textContent = "";
        usedTile.removeAttribute("data-matched");
        state.map.delete(usedTile);
        DOM.selectAll(".ans-tiles.active").forEach((b) =>
          b.classList.remove("active"),
        );
        wordBtn.classList.remove("used");
        state.selectedWord = null;
        return;
      }

      if (state.selectedWord === wordBtn) {
        wordBtn.classList.remove("active");
        state.selectedWord = null;
        return;
      }

      DOM.selectAll(".ans-tiles.active").forEach((b) =>
        b.classList.remove("active"),
      );

      wordBtn.classList.add("active");
      state.selectedWord = wordBtn;
    },

    handleTilePlacement(tile) {
      const state = this.tileState;
      const wordBtn = state.selectedWord;
      if (!wordBtn) return;

      const number = wordBtn.dataset.id;
      const fullText = wordBtn.textContent.trim().toLowerCase();

      state.map.forEach((btn, oldTile) => {
        if (btn === wordBtn) {
          oldTile.textContent = "";
          oldTile.removeAttribute("data-matched");
          state.map.delete(oldTile);
        }
      });

      if (state.map.has(tile)) {
        const oldWord = state.map.get(tile);
        oldWord.classList.remove("used");
        state.map.delete(tile);
      }

      tile.textContent = number;
      tile.dataset.matched = fullText;

      wordBtn.classList.remove("active");
      wordBtn.classList.add("used");

      state.map.set(tile, wordBtn);
      state.selectedWord = null;
    },

    // Dropdown
    handleDropdownToggle(header) {
      const card = header.closest(".logic-card");
      card.classList.toggle("open");
    },

    handleDropdownSelect(item) {
      const card = item.closest(".logic-card");
      const selectedText = item.textContent.trim();

      DOM.select(".logic-left span", card).textContent = selectedText;
      card.dataset.selected = DOM.normalize(selectedText);
      card.classList.add("selected");
      card.classList.remove("open");
    },

    handleDropdownClickOutside(target) {
      if (!target.closest(".logic-card")) {
        DOM.selectAll(".logic-card.open").forEach((card) =>
          card.classList.remove("open"),
        );
      }
    },

    // Radio
    handleRadioChange(radio) {
      radio.closest(".question").classList.add("selected");
    },

    // Prompt Generator - Copy
    handleCopyPrompt(btn) {
      const section = btn.closest(".page");
      if (!section) return;

      // Build prompt
      const prompt = PromptGenerator.buildPrompt(section);

      // Try modern clipboard API first (works on HTTPS)
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(prompt)
          .then(() => {
            const originalText = btn.textContent;
            btn.textContent = "Copied!";

            setTimeout(() => {
              btn.textContent = originalText;
            }, 1200);

            Logger.success("Prompt copied to clipboard (Clipboard API)");

            // CHANGE THIS LINE - pass the button
            this.toggleTutorialImages(btn); // ← ADD 'btn' parameter
          })
          .catch((err) => {
            Logger.error("Clipboard API failed, using fallback:", err);
            this.fallbackCopyTextToClipboard(prompt, btn);
          });
      } else {
        Logger.warn("Clipboard API not available, using fallback method");
        this.fallbackCopyTextToClipboard(prompt, btn);
      }
    },

    // NEW CODE - USE THIS
    toggleTutorialImages(btn) {
      // Find the task-id from the button's page
      const currentPage = btn.closest(".page");
      const taskId = currentPage.dataset.taskId;

      if (!taskId) {
        Logger.warn("No task-id found on current page");
        return;
      }

      // Find ALL pages with this task-id
      const taskPages = document.querySelectorAll(`[data-task-id="${taskId}"]`);

      taskPages.forEach((page) => {
        // Hide static image (if exists)
        const staticImage = page.querySelector(".task-static-image");
        if (staticImage) {
          staticImage.style.display = "none";
          Logger.success("Hid static image");
        }

        // Hide content (if exists)
        const content = page.querySelector(".task-content");
        if (content) {
          content.style.display = "none";
          Logger.success("Hid task content");
        }

        // Show GIF (if exists)
        const gif = page.querySelector(".task-animated-gif");
        if (gif) {
          gif.style.display = "block";
          Logger.success("Showed animated GIF");
        }
      });
    },

    // FALLBACK METHOD
    fallbackCopyTextToClipboard(text, btn) {
      const textArea = document.createElement("textarea");
      textArea.value = text;

      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand("copy");

        if (successful) {
          const originalText = btn.textContent;
          btn.textContent = "Copied!";

          setTimeout(() => {
            btn.textContent = originalText;
          }, 1200);

          Logger.success("Prompt copied to clipboard (Fallback method)");
          UIFeedback.showToast("Prompt copied!", 1500);

          // CHANGE THIS LINE - pass the button
          this.toggleTutorialImages(btn); // ← ADD 'btn' parameter
        } else {
          throw new Error("Copy command was unsuccessful");
        }
      } catch (err) {
        Logger.error("Fallback copy failed:", err);
        UIFeedback.showToast("Failed to copy. Please copy manually.", 2500);
        alert("Copy this prompt manually:\n\n" + text);
      }

      document.body.removeChild(textArea);
    },

    // Image/Prompt Areas
    setupPasteAreas() {
      // this.initImageAreas();
      // this.initPromptAreas();
      this.initPromptAreas();
      this.initSubmitButtons();
    },

    initImageAreas() {
      DOM.selectAll(".image-area").forEach((area) => {
        if (area.dataset.pasteSetup) return;
        area.dataset.pasteSetup = "true";
        this.attachImageEventListeners(area);
      });
    },

    attachImageEventListeners(area) {
      const fileInput = DOM.select(".file-input", area);
      const uploadPlaceholder = DOM.select(".upload-placeholder", area);

      if (!fileInput || !uploadPlaceholder) {
        Logger.warn("Missing file input or upload placeholder");
        return;
      }

      const clickHandler = () => fileInput.click();
      uploadPlaceholder.removeEventListener("click", clickHandler);
      uploadPlaceholder.addEventListener("click", clickHandler);

      const changeHandler = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith("image/")) {
          this.displayImage(area, file);
        }
        e.target.value = "";
      };
      fileInput.removeEventListener("change", changeHandler);
      fileInput.addEventListener("change", changeHandler);

      const pasteHandler = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let item of items) {
          if (item.type.startsWith("image/")) {
            e.preventDefault();
            const file = item.getAsFile();
            this.displayImage(area, file);
            return;
          }
        }
      };
      area.removeEventListener("paste", pasteHandler);
      area.addEventListener("paste", pasteHandler);

      const clickFocusHandler = (e) => {
        if (!e.target.closest(".upload-placeholder")) {
          area.focus();
        }
      };
      area.removeEventListener("click", clickFocusHandler);
      area.addEventListener("click", clickFocusHandler);

      Logger.log("✅ Image area listeners attached");
    },

    async displayImage(area, file) {
      const reader = new FileReader();

      reader.onload = async () => {
        area.dataset.imageData = reader.result;
        area.classList.add("has-data");
        area.classList.remove("has-content", "filled");

        area.innerHTML = "";
        const imgWrapper = document.createElement("div");
        imgWrapper.className = "image-wrapper";

        const img = document.createElement("img");
        img.src = reader.result;

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-image-btn";
        removeBtn.innerHTML = '<i class="fa-solid fa-times"></i> Remove';
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.removeImage(area);
        });

        imgWrapper.appendChild(img);
        imgWrapper.appendChild(removeBtn);
        area.appendChild(imgWrapper);

        Logger.success("Image ready to upload");

        // 🆕 AUTO-UPLOAD TO CLOUDINARY
        if (area.dataset.uploading !== "true") {
          area.dataset.uploading = "true";
          UIFeedback.showToast("Uploading image...", 3000);

          const cloudinaryUrl = await CloudinaryUploader.uploadImage(
            reader.result,
          );
          area.dataset.uploading = "false";

          if (cloudinaryUrl) {
            area.dataset.cloudinaryUrl = cloudinaryUrl;
            area.classList.add("has-content", "filled");
            area.classList.remove("has-data");

            Logger.success("Image uploaded to Cloudinary automatically");
            UIFeedback.showToast("Image uploaded successfully!", 2000);
          } else {
            UIFeedback.showToast("Upload failed. Please try again.", 3000);
            this.removeImage(area);
          }
        }
      };

      reader.readAsDataURL(file);
    },

    removeImage(area) {
      area.innerHTML = "";
      area.classList.remove("has-content", "filled", "has-data");
      delete area.dataset.imageData;
      delete area.dataset.cloudinaryUrl;
      delete area.dataset.uploading;
      delete area.dataset.pasteSetup;

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.className = "file-input";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";

      const uploadText = document.createElement("div");
      uploadText.className = "upload-text";
      uploadText.innerHTML = `
    <span class="upload-icon icon"><i class="fa-solid fa-upload"></i></span>
    <span class="upload-label label">Upload</span>
    <span class="upload-hint hint">or press Ctrl+V to paste</span>
  `;

      const uploadPlaceholder = document.createElement("div");
      uploadPlaceholder.className = "upload-placeholder";
      uploadPlaceholder.appendChild(fileInput);
      uploadPlaceholder.appendChild(uploadText);

      area.appendChild(uploadPlaceholder);

      setTimeout(() => {
        this.attachImageEventListeners(area);
      }, 0);

      Logger.success("Image removed");
      UIFeedback.showToast("Image removed - ready to upload again!");
    },

    initPromptAreas() {
      DOM.selectAll(".prompt-area").forEach((area) => {
        if (area.dataset.pasteSetup) return;
        area.dataset.pasteSetup = "true";
        this.attachPromptEventListeners(area);
      });
    },

    attachPromptEventListeners(area) {
      const textarea = DOM.select(".prompt-textarea", area);
      if (!textarea) return;

      const inputHandler = () => {
        const text = textarea.value.trim();
        if (text) {
          area.classList.add("has-data");
          area.dataset.pastedText = textarea.value;

          // Auto-submit after typing
          if (!area.classList.contains("has-content")) {
            this.autoSubmitPrompt(area, textarea);
          }
        } else {
          area.classList.remove("has-data", "has-content");
          delete area.dataset.pastedText;
          textarea.style.display = "block";
          const displayDiv = DOM.select(".submitted-text", area);
          if (displayDiv) displayDiv.remove();
        }
      };
      textarea.removeEventListener("input", inputHandler);
      textarea.addEventListener("input", inputHandler);

      const keydownHandler = (e) => {
        if (e.key === "Tab") {
          e.preventDefault();
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          textarea.value =
            textarea.value.substring(0, start) +
            "\t" +
            textarea.value.substring(end);
          textarea.selectionStart = textarea.selectionEnd = start + 1;
          textarea.dispatchEvent(new Event("input"));
        }
      };
      textarea.removeEventListener("keydown", keydownHandler);
      textarea.addEventListener("keydown", keydownHandler);

      const clickHandler = () => textarea.focus();
      area.removeEventListener("click", clickHandler);
      area.addEventListener("click", clickHandler);
    },

    // New method for auto-submitting prompt
    autoSubmitPrompt(promptArea, textarea) {
      if (textarea.value.trim()) {
        promptArea.dataset.pastedText = textarea.value;
        promptArea.classList.add("has-content");
        promptArea.classList.remove("has-data");

        const displayDiv = document.createElement("div");
        displayDiv.className = "submitted-text";
        displayDiv.textContent = textarea.value;

        // Make the display div editable so users can modify text
        displayDiv.contentEditable = "true";

        // Update dataset when user edits
        displayDiv.addEventListener("input", () => {
          promptArea.dataset.pastedText = displayDiv.textContent.trim();
          textarea.value = displayDiv.textContent.trim();

          // If all text is deleted, restore textarea
          if (!displayDiv.textContent.trim()) {
            promptArea.classList.remove("has-content");
            displayDiv.remove();
            textarea.style.display = "block";
            textarea.focus();
          }
        });

        textarea.style.display = "none";
        promptArea.appendChild(displayDiv);

        Logger.success(
          "Prompt auto-submitted (editable - ready for final submission)",
        );
      }
    },

    initSubmitButtons() {
      DOM.selectAll(".submit-card .submit-btn").forEach((btn) => {
        if (btn.dataset.submitSetup) return;
        btn.dataset.submitSetup = "true";

        const clickHandler = (e) => {
          e.stopPropagation();
          const card = btn.closest(".submit-card");

          // if (card.classList.contains("image-card")) {
          //   this.handleImageSubmit(card);
          // } else
          if (card.classList.contains("prompt-card")) {
            this.handlePromptSubmit(card);
          }
        };

        btn.removeEventListener("click", clickHandler);
        btn.addEventListener("click", clickHandler);
      });
    },

    async handleImageSubmit(card) {
      const imageArea = DOM.select(".image-area", card);

      if (imageArea && imageArea.dataset.cloudinaryUrl) {
        // Image already uploaded via auto-upload
        UIFeedback.showToast("Image already uploaded!", 1500);
      } else if (imageArea && imageArea.dataset.imageData) {
        // Fallback: manual upload if auto-upload failed
        if (imageArea.dataset.uploading === "true") {
          Logger.warn("Upload already in progress");
          return;
        }

        imageArea.dataset.uploading = "true";
        UIFeedback.showToast("Uploading image...", 3000);

        const cloudinaryUrl = await CloudinaryUploader.uploadImage(
          imageArea.dataset.imageData,
        );
        imageArea.dataset.uploading = "false";

        if (!cloudinaryUrl) {
          UIFeedback.showToast("Image upload failed. Please try again.", 3000);
          return;
        }

        imageArea.dataset.cloudinaryUrl = cloudinaryUrl;
        imageArea.classList.add("has-content", "filled");
        imageArea.classList.remove("has-data");

        const removeBtn = DOM.select(".remove-image-btn", imageArea);
        if (removeBtn) {
          removeBtn.style.display = "none";
        }

        Logger.success("Image uploaded to Cloudinary");
        UIFeedback.showToast("Image uploaded successfully!");
      } else {
        UIFeedback.showToast("Please upload or paste an image first!", 2500);
      }
    },

    showToast(message, duration = 2000) {
      const toast = document.getElementById("toast");
      if (toast) {
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), duration);
      }
    },
    handlePromptSubmit(card) {
      const promptArea = DOM.select(".prompt-area", card);
      const textarea = DOM.select(".prompt-textarea", promptArea);

      if (textarea && textarea.value.trim()) {
        promptArea.dataset.pastedText = textarea.value;
        promptArea.classList.add("has-content");
        promptArea.classList.remove("has-data");

        const displayDiv = document.createElement("div");
        displayDiv.className = "submitted-text";
        displayDiv.textContent = textarea.value;

        textarea.style.display = "none";
        promptArea.appendChild(displayDiv);

        Logger.success("Prompt submitted");
        UIFeedback.showToast("Prompt submitted successfully!");
      } else {
        UIFeedback.showToast("Please enter text first!", 2500);
      }
    },
  };

  /* =====================================================
     SUBMIT HANDLER
  ===================================================== */

  /* =====================================================
   SUBMIT HANDLER
===================================================== */

  const SubmitHandler = {
    handle(submitBtn) {
      Logger.separator();
      Logger.log("SUBMIT CLICKED");
      Logger.separator();

      const submitPage = submitBtn.closest(".page");
      const taskId = submitPage.dataset.taskId;
      const taskType = submitPage.dataset.type;

      if (!taskId) {
        Logger.error("No task-id found on submit page");
        return;
      }

      const taskPages = DOM.selectAll(`[data-task-id="${taskId}"]`);
      Logger.log(
        `Task: ${taskId} | Type: ${taskType} | Pages: ${taskPages.length}`,
      );

      UIFeedback.clearValidationStates(taskPages);

      const validatorMap = {
        "multi-select": TaskValidators.multiSelect,
        tiles: TaskValidators.tiles,
        select: TaskValidators.select,
        "true-false": TaskValidators.trueFalse,
        "prompt-generator": TaskValidators.promptGenerator,
        "image-prompt": TaskValidators.imagePasteSubmit,
      };

      const validator = validatorMap[taskType];

      if (!validator) {
        Logger.error(`Unknown task type: ${taskType}`);
        return;
      }

      const isValid = validator.call(TaskValidators, taskPages);

      Logger[isValid ? "success" : "error"](
        isValid ? "ALL CORRECT!" : "INCOMPLETE/WRONG",
      );

      // CHECK if this is image-submit button
      const isImageSubmit = submitBtn.classList.contains("image-submit");

      if (isImageSubmit) {
        if (isValid) {
          Logger.log("Image submit validation passed, processing...");
          InteractionHandlers.showToast("Submitted successfully!", 2000);
          StorageManager.markTaskComplete(taskId);

          // Prepare AI activity data with correct activity_id from data-activity
          Logger.log(
            "Calling prepareAIActivityData with taskPages:",
            taskPages.length,
          );
          const aiActivityData = SubmitHandler.prepareAIActivityData(
            taskPages,
            taskId,
          );

          if (aiActivityData) {
            Logger.success(
              "✅ Activity data prepared successfully:",
              aiActivityData,
            );
            Logger.log("Now submitting to sheet...");
            SubmitHandler.submitToSheet(aiActivityData);
          } else {
            Logger.error(
              "❌ Failed to prepare activity data - missing image or prompt",
              { taskId, pages: taskPages.length },
            );
          }

          SubmitHandler.showSubmittedMessage();
          // Save to local storage
          SubmitHandler.saveImagePromptData(taskPages, taskId);

          SubmitHandler.hideRemoveButtons(taskPages);
          SubmitHandler.updateButtonStates(submitPage, true);
        } else {
          Logger.warn("Image submit validation failed");
          InteractionHandlers.showToast(
            "Please upload both image and prompt!",
            2500,
          );
        }
      } else {
        UIFeedback.showResult(isValid);
        if (isValid) {
          StorageManager.markTaskComplete(taskId);
        }
      }

      Logger.separator();
    },
    // Show "You have submitted" message
    showSubmittedMessage() {
      alert("You have submitted");
    },

    submitToSheet(aiActivityData) {
      const SHEET_URL =
        "https://script.google.com/macros/s/AKfycbwQ-p8Ln-uvA29bBX-aznGrvo1azmuFBSFRNHK_N1yc_IOiSiU9Y1nOc-SwB7_ob_GWtg/exec";

      if (!aiActivityData) {
        Logger.error("❌ Cannot submit: aiActivityData is null");
        return;
      }

      const registrationData =
        JSON.parse(localStorage.getItem("aghRegistrationData")) || {};
      const formDetails = registrationData.formDetails || {};

      if (!formDetails.schoolID || !formDetails.fullName) {
        Logger.error("❌ Missing student data in localStorage:", {
          schoolID: formDetails.schoolID,
          name: formDetails.fullName,
        });
        return;
      }

      const formData = new FormData();

      formData.append("action", "upsertActivity");
      formData.append("schoolId", formDetails.schoolID);
      formData.append("name", formDetails.fullName);
      formData.append("activity_id", aiActivityData.activity_id);
      formData.append("chat_link", aiActivityData.chat_link); // Changed here
      formData.append("created_at", aiActivityData.created_at);

      Logger.log("📤 Submitting activity (will update if exists):", {
        schoolId: formDetails.schoolID,
        name: formDetails.fullName,
        activityId: aiActivityData.activity_id,
        chatLink: aiActivityData.chat_link,
      });

      fetch(SHEET_URL, {
        method: "POST",
        body: formData,
      })
        .then((response) => response.text())
        .then((text) => {
          Logger.success("✅ Sheet response:", text);
          try {
            const json = JSON.parse(text);
            Logger.success(
              `✅ Activity ${aiActivityData.activity_id} ${json.updated ? "updated" : "inserted"}`,
              json,
            );
          } catch (e) {
            Logger.warn("Response was not JSON:", text);
          }
        })
        .catch((err) => {
          Logger.error("❌ Sheet submission error:", err);
        });
    },

    handleResubmit(resubmitBtn) {
      Logger.separator();
      Logger.log("RESUBMIT CLICKED");
      Logger.separator();

      const submitPage = resubmitBtn.closest(".page");
      const taskId = submitPage.dataset.taskId;

      if (!taskId) {
        Logger.error("No task-id found");
        return;
      }

      const taskPages = DOM.selectAll(`[data-task-id="${taskId}"]`);

      taskPages.forEach((page) => {
        // const imageArea = DOM.select(".image-area", page);
        // if (imageArea) {
        //   InteractionHandlers.removeImage(imageArea);
        // }

        const promptArea = DOM.select(".prompt-area", page);
        if (promptArea) {
          const displayDiv = DOM.select(".submitted-text", promptArea);
          if (displayDiv) displayDiv.remove();
          const textarea = DOM.select(".prompt-textarea", promptArea);
          if (textarea) {
            textarea.style.display = "block";
            textarea.value = "";
            promptArea.classList.remove("has-content", "has-data");
            delete promptArea.dataset.pastedText;
          }
        }
      });

      const progress = StorageManager.getProgress();
      delete progress.taskData[taskId];
      const index = progress.completedTasks.indexOf(taskId);
      if (index > -1) {
        progress.completedTasks.splice(index, 1);
      }
      StorageManager.saveProgress(progress);

      this.updateButtonStates(submitPage, false);
      InteractionHandlers.showToast("Ready to submit again!", 2000);
      Logger.separator();
    },

    prepareAIActivityData(taskPages, taskId) {
      let chatLink = null;
      let activityId = null;

      // Get activity_id from data-activity attribute
      for (const page of taskPages) {
        const dataActivity = page.dataset.activity;
        if (dataActivity) {
          activityId = parseInt(dataActivity);
          Logger.log(
            `📍 Found data-activity="${dataActivity}" → activityId=${activityId}`,
          );
          break;
        }
      }

      if (!activityId) {
        Logger.error(
          "❌ CRITICAL: No data-activity attribute found on any task page",
          { taskId, pages: taskPages.length },
        );
        return null;
      }

      // Find chat link
      for (const page of taskPages) {
        const promptArea = DOM.select(".prompt-area", page);
        if (promptArea) {
          const submittedText = DOM.select(".submitted-text", promptArea);
          const textarea = DOM.select(".prompt-textarea", promptArea);
          const text =
            submittedText?.textContent.trim() || textarea?.value.trim() || "";
          if (text) {
            chatLink = text;
            Logger.log("✅ Found chat link on page:", page.className);
            break;
          }
        }
      }

      if (!chatLink) {
        Logger.error("❌ Missing chat link", {
          chatLink: !!chatLink,
          activityId,
          taskId,
          pages: taskPages.length,
        });
        return null;
      }

      const activityData = {
        activity_id: activityId,
        chat_link: chatLink, // Changed from prompt_text and generated_image_url
        created_at: new Date().toISOString(),
      };

      Logger.success(`✅ Prepared activity #${activityId} data:`, activityData);
      return activityData;
    },

    saveChatLinkData(taskPages, taskId) {
      const data = {};

      taskPages.forEach((page) => {
        const promptArea = DOM.select(".prompt-area", page);
        if (promptArea) {
          const submittedText = DOM.select(".submitted-text", promptArea);
          const textarea = DOM.select(".prompt-textarea", promptArea);
          const chatLink =
            submittedText?.textContent.trim() || textarea?.value.trim() || "";
          if (chatLink) {
            data.chatLink = chatLink;
          }
        }
      });

      StorageManager.saveTaskData(taskId, data);
      Logger.success("Chat link saved to local storage");
    },

    hideRemoveButtons(taskPages) {
      taskPages.forEach((page) => {
        // Make prompt non-editable after final submission
        const promptDisplayDiv = DOM.select(".submitted-text", page);
        if (promptDisplayDiv) {
          promptDisplayDiv.contentEditable = "false";
          promptDisplayDiv.style.cursor = "default";
        }
      });
      Logger.log("Chat link locked after submission");
    },

    // // Update button states after submit/resubmit
    // updateButtonStates(page, isSubmitted) {
    // const submitBtn = DOM.select(".submit.image-submit", page);
    // const resubmitBtn = DOM.select(".resubmit", page);

    // if (!submitBtn || !resubmitBtn) return;

    // if (isSubmitted) {
    //     submitBtn.textContent = "Submitted";
    //     submitBtn.disabled = true;
    //     submitBtn.classList.add("submitted");
    //     submitBtn.style.opacity = "0.6";

    //     resubmitBtn.disabled = false;
    //     resubmitBtn.classList.remove("disabled");
    //     resubmitBtn.style.opacity = "1";

    //     Logger.log("Buttons: Submit disabled, Resubmit enabled");
    // } else {
    //     submitBtn.innerHTML = '<img src="img/icon2.svg" alt=""> Submit';
    //     submitBtn.disabled = false;
    //     submitBtn.classList.remove("submitted");
    //     submitBtn.style.opacity = "1";

    //     resubmitBtn.disabled = true;
    //     resubmitBtn.classList.add("disabled");
    //     resubmitBtn.style.opacity = "0.5";

    //     Logger.log("Buttons: Submit enabled, Resubmit disabled");
    // }
    // },

    updateButtonStates(page, isSubmitted) {
      const submitBtn = DOM.select("#submit, #resubmit", page);

      if (!submitBtn) return;

      if (isSubmitted) {
        // Convert submit → resubmit visually
        submitBtn.id = "resubmit";
        submitBtn.classList.remove("submit", "image-submit");
        submitBtn.classList.add("resubmit");
        submitBtn.innerHTML = " Resubmit";
        submitBtn.disabled = false;

        Logger.log("Converted Submit to Resubmit");
      } else {
        // Convert resubmit → submit
        submitBtn.id = "submit";
        submitBtn.classList.add("submit", "image-submit");
        submitBtn.classList.remove("resubmit");
        submitBtn.innerHTML = "Submit";
        submitBtn.disabled = false;

        Logger.log("Converted Resubmit to Submit");
      }
    },
  };

  document.addEventListener("click", (e) => {
    if (e.target.matches("#resubmit")) {
      SubmitHandler.handleResubmit(e.target);
    }
  });

  /* =====================================================
     EVENT LISTENERS
  ===================================================== */
  const EventListeners = {
    init() {
      setTimeout(() => {
        InteractionHandlers.setupPasteAreas();
      }, 500);

      const observer = new MutationObserver(() => {
        InteractionHandlers.setupPasteAreas();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      document.addEventListener("click", (e) => {
        const endSessionBtn = e.target.closest("#end-session");
        if (endSessionBtn) {
          e.preventDefault();
          EndSessionHandler.showConfirmation();
          return;
        }
        // FIX: Get the closest button, not just .submit
        const submitBtn =
          e.target.closest("button.submit") || e.target.closest(".submit");
        if (submitBtn) {
          console.log("✅ Submit button clicked:", submitBtn);
          e.preventDefault();
          e.stopPropagation();
          SubmitHandler.handle(submitBtn);
          return;
        }

        const resubmitBtn =
          e.target.closest("button.resubmit") || e.target.closest(".resubmit");
        if (resubmitBtn) {
          console.log("✅ Resubmit button clicked:", resubmitBtn);
          e.preventDefault();
          e.stopPropagation();
          SubmitHandler.handleResubmit(resubmitBtn);
          return;
        }

        const multiBtn = e.target.closest(".ans-multi");
        if (multiBtn) {
          InteractionHandlers.handleMultiSelectClick(multiBtn);
          return;
        }

        const wordBtn = e.target.closest(".ans-tiles");
        if (wordBtn) {
          InteractionHandlers.handleTileWordClick(wordBtn);
          return;
        }

        const tile = e.target.closest(".tile");
        if (tile) {
          InteractionHandlers.handleTilePlacement(tile);
          return;
        }

        const dropdownHeader = e.target.closest(".logic-header");
        if (dropdownHeader) {
          InteractionHandlers.handleDropdownToggle(dropdownHeader);
          return;
        }

        const dropdownItem = e.target.closest(".logic-item");
        if (dropdownItem) {
          InteractionHandlers.handleDropdownSelect(dropdownItem);
          return;
        }

        const copyPromptBtn = e.target.closest(".copyPromptBtn"); // CHANGED to class
        if (copyPromptBtn) {
          e.preventDefault();
          InteractionHandlers.handleCopyPrompt(copyPromptBtn);
          return;
        }

        InteractionHandlers.handleDropdownClickOutside(e.target);

        // Handle span color tag clicks for copying
        const colorSpan = e.target.closest(
          "span.red, span.purple, span.yellow, span.green",
        );
        if (colorSpan) {
          const textToCopy = colorSpan.textContent.trim();

          // Remove highlight from previous span
          if (lastCopiedSpan) {
            lastCopiedSpan.classList.remove("copied-highlight");
          }

          // Highlight current span + store copied text
          lastCopiedText = textToCopy;
          lastCopiedSpan = colorSpan;
          colorSpan.classList.add("copied-highlight");

          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard
              .writeText(textToCopy)
              .then(() => {
                Logger.success(`Copied: "${textToCopy}"`);
                UIFeedback.showToast("Text copied", 1200);
                showCopiedBubble(colorSpan, "Copied");
              })
              .catch((err) => {
                Logger.error("Clipboard API failed:", err);
                InteractionHandlers.fallbackCopyTextToClipboard(
                  textToCopy,
                  colorSpan,
                );
              });
          } else {
            InteractionHandlers.fallbackCopyTextToClipboard(
              textToCopy,
              colorSpan,
            );
          }
          return;
        }

        // NEW — click editable cell to paste copied text
        const editableCell = e.target.closest(".editable");
        if (editableCell && lastCopiedText) {
          const existing = editableCell.innerText.trim();
          editableCell.innerText = existing
            ? existing + ", " + lastCopiedText
            : lastCopiedText;

          if (lastCopiedSpan) {
            lastCopiedSpan.classList.remove("copied-highlight");
            lastCopiedSpan = null;
          }
          lastCopiedText = null;
          return;
        }
      });

      document.addEventListener("change", (e) => {
        if (e.target.matches("input[type=radio]")) {
          InteractionHandlers.handleRadioChange(e.target);
        }
      });
      setTimeout(() => {
        // Direct listeners for submit buttons
        DOM.selectAll("button.submit").forEach((btn) => {
          btn.addEventListener("click", function (e) {
            console.log("Direct submit click");
            e.preventDefault();
            e.stopPropagation();
            SubmitHandler.handle(this);
          });
        });

        // Direct listeners for resubmit buttons
        DOM.selectAll("button.resubmit").forEach((btn) => {
          btn.addEventListener("click", function (e) {
            console.log("Direct resubmit click");
            e.preventDefault();
            e.stopPropagation();
            SubmitHandler.handleResubmit(this);
          });
        });

        console.log("✅ Direct button listeners attached");
      }, 1000);
    },
  };

  /* =====================================================
     INITIALIZATION
  ===================================================== */

  const App = {
    init() {
      Logger.separator();
      Logger.success("AGH Book System Initialized");
      Logger.separator();

      EventListeners.init();

      $(document).ready(function () {
        setTimeout(() => {
          PageLockManager.init();
          NavigationManager.init();

          // Restore saved image-prompt data
          // App.restoreImagePromptData();
          App.restoreChatLinkData();
        }, 500);
      });
    },

    // Restore saved image and prompt data from local storage
    restoreChatLinkData() {
      const progress = StorageManager.getProgress();

      Object.keys(progress.taskData).forEach((taskId) => {
        const data = progress.taskData[taskId];
        if (data && (data.cloudinaryUrl || data.promptText)) {
          const taskPages = DOM.selectAll(`[data-task-id="${taskId}"]`);

          taskPages.forEach((page) => {
            // Restore Cloudinary image
            if (data.cloudinaryUrl) {
              const imageArea = DOM.select(".image-area", page);
              if (imageArea) {
                imageArea.dataset.cloudinaryUrl = data.cloudinaryUrl;
                imageArea.innerHTML = "";
                imageArea.classList.add("has-content", "filled");
                imageArea.classList.remove("has-data");

                const imgWrapper = document.createElement("div");
                imgWrapper.className = "image-wrapper";

                const img = document.createElement("img");
                img.src = data.cloudinaryUrl;

                imgWrapper.appendChild(img);
                imageArea.appendChild(imgWrapper);

                Logger.log("Restored Cloudinary image for task: " + taskId);
              }
            }

            // Restore prompt
            if (data.promptText) {
              const promptArea = DOM.select(".prompt-area", page);
              if (promptArea) {
                const textarea = DOM.select(".prompt-textarea", promptArea);
                if (textarea) {
                  promptArea.dataset.pastedText = data.promptText;
                  promptArea.classList.add("has-content");
                  promptArea.classList.remove("has-data");

                  const displayDiv = document.createElement("div");
                  displayDiv.className = "submitted-text";
                  displayDiv.textContent = data.promptText;

                  displayDiv.contentEditable = "false";
                  displayDiv.style.cursor = "default";

                  textarea.style.display = "none";
                  promptArea.appendChild(displayDiv);
                }
              }
            }

            // Restore button states
            if (StorageManager.isTaskComplete(taskId)) {
              SubmitHandler.updateButtonStates(page, true);
            }
          });

          Logger.success(`Restored data for task: ${taskId}`);
        }
      });

      // Initialize button states
      DOM.selectAll('[data-type="image-prompt"]').forEach((page) => {
        const taskId = page.dataset.taskId;
        const isCompleted = StorageManager.isTaskComplete(taskId);

        if (!isCompleted) {
          const resubmitBtn = DOM.select(".resubmit", page);
          if (resubmitBtn) {
            resubmitBtn.disabled = true;
            resubmitBtn.classList.add("disabled");
            resubmitBtn.style.opacity = "0.5";
          }
        }
      });
    },
  };
  /* =====================================================
    END SESSION HANDLER
 ===================================================== */
  const EndSessionHandler = {
    showConfirmation() {
      // Create popup if it doesn't exist
      let popup = document.getElementById("endSessionPopup");

      if (!popup) {
        popup = this.createPopup();
        document.body.appendChild(popup);
      }

      popup.classList.add("show");
      Logger.log("End session confirmation shown");

      // Setup button handlers
      this.setupPopupButtons();
    },

    createPopup() {
      const popup = document.createElement("div");
      popup.id = "endSessionPopup";
      popup.className = "end-session-popup";
      popup.innerHTML = `
      <div class="end-session-box">
        <h2>End Session</h2>
        <p>Do you want to end the session?</p>
        <div class="end-session-buttons">
          <button id="endSessionCancel" class="btn-cancel">Cancel</button>
          <button id="endSessionOk" class="btn-ok">OK</button>
        </div>
      </div>
    `;

      return popup;
    },

    setupPopupButtons() {
      const popup = document.getElementById("endSessionPopup");
      const cancelBtn = document.getElementById("endSessionCancel");
      const okBtn = document.getElementById("endSessionOk");

      if (!cancelBtn || !okBtn) return;

      // Remove old listeners by cloning
      const newCancelBtn = cancelBtn.cloneNode(true);
      const newOkBtn = okBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      okBtn.parentNode.replaceChild(newOkBtn, okBtn);

      // Cancel button
      newCancelBtn.addEventListener("click", () => {
        popup.classList.remove("show");
        Logger.log("End session cancelled");
      });

      // OK button
      newOkBtn.addEventListener("click", () => {
        popup.classList.remove("show");
        this.endSession();
      });

      // Close on outside click
      popup.addEventListener("click", (e) => {
        if (e.target === popup) {
          popup.classList.remove("show");
          Logger.log("End session cancelled (outside click)");
        }
      });
    },

    endSession() {
      Logger.separator();
      Logger.success("SESSION ENDED");
      Logger.separator();

      // Show success message
      this.showSuccessMessage();

      // Mark that user should see last 4 questions
      const storedData =
        JSON.parse(localStorage.getItem("aghRegistrationData")) || {};
      storedData.showLastFourQuestions = true;
      localStorage.setItem("aghRegistrationData", JSON.stringify(storedData));

      // Redirect after 1.5 seconds to reload the page
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },

    showSuccessMessage() {
      alert("You have completed");
      Logger.success("Success message shown");
    },

    // showSubmittedMessage() {
    //   alert("You have submitted");
    // },
  };

  App.init();
})();
