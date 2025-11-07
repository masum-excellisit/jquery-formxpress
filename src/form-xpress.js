/*!
 * FormXpress
 * Universal jQuery Auto-Validation & Smart-Upload Plugin
 * Author: Masum
 */
(function ($) {
  $.fn.FormXpress = function (options) {
    const baseSettings = {
      submitButton: null,
      errorClass: "input-error",
      errorSpanClass: "error-text",
      progressBarClass: "file-progress",
      previewClass: "file-preview",
      showNameError: true,
      humanizeNames: true, // Convert field names to readable format
      successMessage: "Form submitted successfully!",
      ajax: true,
      resetAfterSubmit: false,
      maxFileSize: 10485760, // 10MB in bytes
      allowedFileTypes: [], // ['image/*', 'application/pdf']
      customRules: {}, // { fieldName: function(value, input) { return null or error } }

      // Hooks
      beforeValidate: null, // function(form) {}
      afterValidate: null, // function(form, isValid) {}
      beforeSubmit: null, // function(form, formData) { return true/false }
      onSuccess: null, // function(response, form) {}
      onError: null, // function(xhr, form) {}
      onProgress: null, // function(percent, form) {}

      // Messages
      messages: {
        required: "This field is required",
        email: "Please enter a valid email address",
        url: "Please enter a valid URL",
        number: "Please enter a valid number",
        minLength: "Minimum {min} characters required",
        maxLength: "Maximum {max} characters allowed",
        min: "Value must be at least {min}",
        max: "Value must be no more than {max}",
        pattern: "Invalid format",
        fileSize: "File size exceeds {size}MB limit",
        fileType: "Invalid file type",
        phone: "Please enter a valid phone number",
      },
    };
    const settings = $.extend({}, baseSettings, options);
    // Deep merge messages so partial overrides do not wipe defaults
    settings.messages = $.extend(
      {},
      baseSettings.messages,
      options && options.messages
    );

    /* ---------- Inject Recommended CSS once ---------- */
    if (!$("#FormXpressCSS").length) {
      $("head").append(`
                <style id="FormXpressCSS">
                    .${settings.errorClass} {
                        border-color:#ffb7af!important;outline:none;
                    }
                    .${settings.errorSpanClass}{
                        color:#e74c3c;font-size:13px;display:block;margin-top:3px;
                        font-family:sans-serif;animation:fadeIn .3s;
                    }
                    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
                    .${settings.progressBarClass}{
                        width:100%;height:6px;background:#eee;border-radius:3px;
                        margin-top:5px;overflow:hidden;position:relative;
                    }
                    .${settings.progressBarClass} div{
                        height:100%;width:0%;
                        background:linear-gradient(90deg,#00c6ff,#0072ff);
                        transition:width .3s;position:absolute;top:0;left:0;
                    }
                    .${settings.previewClass}{
                        display:inline-block;margin:6px 6px 0 0;font-size:12px;color:#555;
                        border:1px solid #ddd;padding:8px;border-radius:4px;
                        max-width:150px;font-family:sans-serif;position:relative;
                        vertical-align:top;
                    }
                    .${settings.previewClass} img{
                        max-width:100%;border-radius:4px;display:block;margin-bottom:4px;
                    }
                    .${settings.previewClass} .file-name{
                        word-break:break-all;font-size:11px;
                    }
                    .${settings.previewClass} .remove-file{
                        position:absolute;top:2px;right:2px;background:#e74c3c;
                        color:#fff;border:none;border-radius:50%;width:20px;height:20px;
                        cursor:pointer;font-size:12px;line-height:1;padding:0;
                    }
                    .file-previews-container{display:block;margin-top:5px;}
                </style>
            `);
    }

    /* ---------- Utility: Humanize field names ---------- */
    function humanizeName(name) {
      if (!settings.humanizeNames || !name) return name;
      return name
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    /* ---------- Validation helpers ---------- */
    function showError(input, message) {
      clearError(input);
      input.addClass(settings.errorClass);
      const fieldName = settings.showNameError
        ? humanizeName(input.attr("name") || input.attr("id") || "Field")
        : "";
      const prefix = fieldName ? `${fieldName}: ` : "";
      input.after(
        `<span class="${settings.errorSpanClass}">${prefix}${message}</span>`
      );
    }
    // Group error helper (radio/checkbox)
    function showGroupError($groupInputs, message) {
      const first = $groupInputs.first();
      clearError(first);
      first.addClass(settings.errorClass);
      first.after(`<span class="${settings.errorSpanClass}">${message}</span>`);
    }

    function clearError(input) {
      input.removeClass(settings.errorClass);
      input.nextAll(`.${settings.errorSpanClass}`).first().remove();
    }

    function validateInput(input) {
      const val = $.trim(input.val());
      const type = input.attr("type");
      const required = input.prop("required");
      const min = input.attr("min");
      const max = input.attr("max");
      const minlength = input.attr("minlength");
      const maxlength = input.attr("maxlength");
      const pattern = input.attr("pattern");
      const fieldName = input.attr("name");

      // Special: radio / checkbox single element should not pass if not checked
      if (type === "radio" || type === "checkbox") {
        if (required && !input.is(":checked")) {
          // Defer group handling outside (return flag)
          return "__GROUP_REQUIRED__";
        }
        // If not required and not checked treat as empty (skip further validation)
        if (!input.is(":checked")) return null;
      }

      // Required check
      if (required && val === "") return settings.messages.required;

      // Skip further validation if empty and not required
      if (val === "") return null;

      // Min/Max length
      if (minlength && val.length < parseInt(minlength))
        return settings.messages.minLength.replace("{min}", minlength);
      if (maxlength && val.length > parseInt(maxlength))
        return settings.messages.maxLength.replace("{max}", maxlength);

      // Type-specific validation
      if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
        return settings.messages.email;

      if (type === "url" && !/^https?:\/\/.+\..+/.test(val))
        return settings.messages.url;

      if (type === "tel" && !/^[\d\s\-\+\(\)]+$/.test(val))
        return settings.messages.phone;

      // Numeric / range
      if (type === "number" || type === "range") {
        const numVal = parseFloat(val);
        if (isNaN(numVal)) return settings.messages.number;
        if (min && numVal < parseFloat(min))
          return settings.messages.min.replace("{min}", min);
        if (max && numVal > parseFloat(max))
          return settings.messages.max.replace("{max}", max);
      }

      // Date / time types min/max (string compare works for ISO-like formats)
      if (/(date|time|datetime-local|month|week)/.test(type)) {
        if (min && val < min)
          return settings.messages.min.replace("{min}", min);
        if (max && val > max)
          return settings.messages.max.replace("{max}", max);
      }

      // Pattern validation
      if (pattern && !new RegExp(pattern).test(val))
        return settings.messages.pattern;

      // Custom rules
      if (fieldName && settings.customRules[fieldName]) {
        const customError = settings.customRules[fieldName](val, input);
        if (customError) return customError;
      }

      return null;
    }

    /* ---------- File validation ---------- */
    function validateFile(file) {
      // Size check
      if (settings.maxFileSize && file.size > settings.maxFileSize) {
        const sizeMB = (settings.maxFileSize / 1048576).toFixed(1);
        return settings.messages.fileSize.replace("{size}", sizeMB);
      }

      // Type check
      if (settings.allowedFileTypes.length > 0) {
        const allowed = settings.allowedFileTypes.some((type) => {
          if (type.endsWith("/*")) {
            return file.type.startsWith(type.replace("/*", ""));
          }
          return file.type === type;
        });
        if (!allowed) return settings.messages.fileType;
      }

      return null;
    }

    /* ---------- File preview & progress with multi-upload ---------- */
    function handleFilePreview(input) {
      const files = input[0].files;
      const container = input.next(".file-previews-container");

      if (container.length) {
        container.empty();
      } else {
        input.after('<div class="file-previews-container"></div>');
      }

      const previewContainer = input.next(".file-previews-container");

      if (!files.length) return;

      // Store files in data for later upload
      const fileArray = Array.from(files);
      input.data("selectedFiles", fileArray);

      $.each(fileArray, function (index, file) {
        const fileError = validateFile(file);

        const preview = $("<div>")
          .addClass(settings.previewClass)
          .attr("data-file-index", index);

        const removeBtn = $("<button>")
          .addClass("remove-file")
          .html("&times;")
          .attr("type", "button")
          .on("click", function (e) {
            e.preventDefault();
            removeFilePreview(input, index);
          });

        const fileName = $("<div>").addClass("file-name").text(file.name);

        if (fileError) {
          preview.css("border-color", "#ffb7af");
          fileName
            .css("color", "#e74c3c")
            .text(`X ${file.name} - ${fileError}`);
        } else if (file.type.startsWith("image/")) {
          const img = $("<img>");
          const reader = new FileReader();
          reader.onload = (e) => img.attr("src", e.target.result);
          reader.readAsDataURL(file);
          preview.append(img);
        }

        preview.append(fileName).append(removeBtn);
        previewContainer.append(preview);

        // Progress bar for each file
        const progress = $("<div>")
          .addClass(settings.progressBarClass)
          .attr("data-file-index", index)
          .append("<div></div>");
        preview.append(progress);
      });
    }

    /* ---------- Remove file from selection ---------- */
    function removeFilePreview(input, fileIndex) {
      const files = input.data("selectedFiles") || [];
      files.splice(fileIndex, 1);
      input.data("selectedFiles", files);

      // Update preview
      const container = input.next(".file-previews-container");
      container
        .find(`.${settings.previewClass}[data-file-index="${fileIndex}"]`)
        .remove();

      // Reindex remaining previews
      container.find(`.${settings.previewClass}`).each(function (idx) {
        $(this).attr("data-file-index", idx);
      });
    }

    /* ---------- Upload with progress ---------- */
    // Helper to safely toggle submit button state and label/value
    function setBtnState(btn, submitting) {
      if (!btn || !btn.length) return;
      if (submitting) {
        const original =
          btn.data("originalText") ||
          (btn.is("input") ? btn.val() : btn.text());
        if (!btn.data("originalText")) btn.data("originalText", original);
        btn.prop("disabled", true);
        if (btn.is("input")) btn.val("Submitting...");
        else btn.text("Submitting...");
      } else {
        btn.prop("disabled", false);
        const original = btn.data("originalText") || "Submit";
        if (btn.is("input")) btn.val(original);
        else btn.text(original);
      }
    }

    function uploadWithProgress(form, submitBtn) {
      const xhr = new XMLHttpRequest();
      xhr.open(form.attr("method") || "POST", form.attr("action"));

      const formData = new FormData();

      // Add all form fields
      form.find("input, textarea, select").each(function () {
        const input = $(this);
        const type = input.attr("type");
        const name = input.attr("name");
        if (!name) return;
        if (type === "file") {
          const files = input.data("selectedFiles") || [];
          files.forEach((file) => {
            const error = validateFile(file);
            if (!error) {
              const finalName = name.endsWith("[]") ? name : name + "[]";
              formData.append(finalName, file);
            }
          });
        } else if (type === "checkbox" || type === "radio") {
          if (input.is(":checked")) formData.append(name, input.val());
        } else {
          formData.append(name, input.val());
        }
      });

      // beforeSubmit hook
      if (
        settings.beforeSubmit &&
        settings.beforeSubmit(form, formData) === false
      ) {
        setBtnState(submitBtn, false);
        return;
      }

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          form
            .find(`.${settings.progressBarClass} div`)
            .css("width", percent + "%");
          if (settings.onProgress) settings.onProgress(percent, form);
        }
      });

      xhr.onload = function () {
        setBtnState(submitBtn, false);

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            if (settings.onSuccess) {
              settings.onSuccess(res, form);
            } else {
              alert(settings.successMessage);
            }

            if (settings.resetAfterSubmit) {
              form[0].reset();
              form.find(".file-previews-container").empty();
              form.find("input").removeData("selectedFiles");
            }
          } catch {
            alert("Response received but invalid JSON format");
          }
        } else {
          if (settings.onError) {
            settings.onError(xhr, form);
          } else {
            alert("Upload failed! Status: " + xhr.status);
          }
        }
      };

      xhr.onerror = function () {
        setBtnState(submitBtn, false);
        if (settings.onError) {
          settings.onError(xhr, form);
        } else {
          alert("Network error occurred!");
        }
      };

      xhr.send(formData);
    }

    /* ---------- Core plugin ---------- */
    return this.each(function () {
      const form = $(this);

      // Disable browser’s native HTML5 validation popups
      form.attr("novalidate", "novalidate").prop("noValidate", true);
      // Extra guard: prevent default validation UI on 'invalid' (capture phase)
      if (form[0] && form[0].addEventListener) {
        form[0].addEventListener(
          "invalid",
          function (e) {
            e.preventDefault();
          },
          true
        );
      }

      // Unique namespace for delegated events for this instance
      const ns = ".FormXpress" + Math.random().toString(36).slice(2);

      // Resolve submit button and support any selector (id/class), inside or outside form
      let submitBtn = $();
      let lastClickedSubmitBtn = $();
      let submitSelector = null;

      function belongsToThisForm(btn) {
        const $btn = $(btn);
        const closestForm = $btn.closest("form");
        if (closestForm.length) return closestForm[0] === form[0];
        const formAttr = $btn.attr("form");
        return formAttr && $("#" + formAttr)[0] === form[0];
      }

      if (settings.submitButton) {
        if (typeof settings.submitButton === "string") {
          submitSelector = settings.submitButton;

          // Prefer a button inside this form if present
          const inside = form.find(submitSelector).first();
          if (inside.length) {
            submitBtn = inside;
          } else {
            // Otherwise, pick the first element in DOM that belongs to this form (via [form] or proximity)
            submitBtn = $(submitSelector)
              .filter(function () {
                return belongsToThisForm(this);
              })
              .first();
          }

          // Delegated click to support dynamic buttons and multiple instances
          $(document)
            .off("click" + ns, submitSelector)
            .on("click" + ns, submitSelector, function (e) {
              if (!belongsToThisForm(this)) return;
              e.preventDefault();
              lastClickedSubmitBtn = $(this);
              // Cache original label/value on first use
              if (!lastClickedSubmitBtn.data("originalText")) {
                lastClickedSubmitBtn.data(
                  "originalText",
                  lastClickedSubmitBtn.is("input")
                    ? lastClickedSubmitBtn.val()
                    : lastClickedSubmitBtn.text()
                );
              }
              form.trigger("submit");
            });
        } else {
          // jQuery object or DOM element
          submitBtn = $(settings.submitButton).first();
          if (submitBtn.length && belongsToThisForm(submitBtn)) {
            submitBtn.data(
              "originalText",
              submitBtn.is("input") ? submitBtn.val() : submitBtn.text()
            );
            submitBtn.off("click" + ns).on("click" + ns, function (e) {
              e.preventDefault();
              lastClickedSubmitBtn = submitBtn;
              form.trigger("submit");
            });
          }
        }
      } else {
        // Fallback: first native submit button inside the form
        submitBtn = form
          .find('button[type="submit"], input[type="submit"]')
          .first();
        if (submitBtn.length) {
          submitBtn.data(
            "originalText",
            submitBtn.is("input") ? submitBtn.val() : submitBtn.text()
          );
          submitBtn.off("click" + ns).on("click" + ns, function (e) {
            // Ensure consistent behavior even if type="submit"
            e.preventDefault();
            lastClickedSubmitBtn = submitBtn;
            form.trigger("submit");
          });
        }
      }

      // Validate on input/blur
      form.find("input, textarea, select").on("input blur", function () {
        const input = $(this);
        if (input.attr("type") === "file") return; // Skip file inputs

        const error = validateInput(input);
        if (error) showError(input, error);
        else clearError(input);
      });

      // File change preview with multi-upload support
      form.find('input[type="file"]').on("change", function () {
        handleFilePreview($(this));
      });

      // Submit event
      form.on("submit", function (e) {
        e.preventDefault();

        // beforeValidate hook
        if (settings.beforeValidate) settings.beforeValidate(form);

        let valid = true;

        // Individual (excluding file)
        form
          .find("input:not([type='file']), textarea, select")
          .each(function () {
            const input = $(this);
            const type = input.attr("type");
            if (type === "radio" || type === "checkbox") return; // group later
            const error = validateInput(input);
            if (error) {
              if (error === "__GROUP_REQUIRED__") return; // handled in group
              showError(input, error);
              valid = false;
            } else clearError(input);
          });

        // Radio groups
        const radioNames = {};
        form.find("input[type='radio']").each(function () {
          const n = this.name;
          if (!n) return;
          radioNames[n] = radioNames[n] || [];
          radioNames[n].push(this);
        });
        $.each(radioNames, function (name, elements) {
          const $group = $(elements);
          const required = $group.first().prop("required");
          if (required && !$group.is(":checked")) {
            showGroupError($group, settings.messages.required);
            valid = false;
          } else if ($group.is(":checked")) {
            clearError($group.first());
          }
        });

        // Checkbox groups (names possibly with [])
        const checkboxNames = {};
        form.find("input[type='checkbox']").each(function () {
          const n = this.name;
          if (!n) return;
          checkboxNames[n] = checkboxNames[n] || [];
          checkboxNames[n].push(this);
        });
        $.each(checkboxNames, function (name, elements) {
          const $group = $(elements);
          const required = $group.first().prop("required");
          if (required && !$group.is(":checked")) {
            showGroupError($group, settings.messages.required);
            valid = false;
          } else if ($group.is(":checked")) {
            clearError($group.first());
          }
        });

        // File inputs
        form.find('input[type="file"]').each(function () {
          const input = $(this);
          const files = input.data("selectedFiles") || [];
          const required = input.prop("required");

          if (required && files.length === 0) {
            showError(input, settings.messages.required);
            valid = false;
          } else {
            let fileError = false;
            files.forEach((file) => {
              if (validateFile(file)) fileError = true;
            });
            if (fileError) valid = false;
          }
        });

        // afterValidate hook
        if (settings.afterValidate) settings.afterValidate(form, valid);

        if (!valid) return;

        // Prefer the last clicked button; otherwise fallback
        const activeBtn =
          (lastClickedSubmitBtn &&
            lastClickedSubmitBtn.length &&
            lastClickedSubmitBtn) ||
          submitBtn;

        setBtnState(activeBtn, true);

        if (settings.ajax) {
          uploadWithProgress(form, activeBtn);
        } else {
          // Non-AJAX submit (native), still no browser validation due to novalidate
          form.off("submit").submit();
        }
      });

      // Public methods via data
      form.data("FormXpress", {
        reset: function () {
          form[0].reset();
          form.find(`.${settings.errorClass}`).removeClass(settings.errorClass);
          form.find(`.${settings.errorSpanClass}`).remove();
          form.find(".file-previews-container").empty();
          form.find("input").removeData("selectedFiles");
          lastClickedSubmitBtn = $();
        },
        validate: function () {
          let valid = true;
          form
            .find("input:not([type='file']), textarea, select")
            .each(function () {
              const input = $(this);
              const type = input.attr("type");
              if (type === "radio" || type === "checkbox") return;
              const error = validateInput(input);
              if (error) {
                if (error === "__GROUP_REQUIRED__") return;
                showError(input, error);
                valid = false;
              } else clearError(input);
            });
          // Radio groups
          const radioNames = {};
          form.find("input[type='radio']").each(function () {
            const n = this.name;
            if (!n) return;
            radioNames[n] = radioNames[n] || [];
            radioNames[n].push(this);
          });
          $.each(radioNames, function (name, elements) {
            const $group = $(elements);
            const required = $group.first().prop("required");
            if (required && !$group.is(":checked")) {
              showGroupError($group, settings.messages.required);
              valid = false;
            } else if ($group.is(":checked")) clearError($group.first());
          });
          // Checkbox groups
          const checkboxNames = {};
          form.find("input[type='checkbox']").each(function () {
            const n = this.name;
            if (!n) return;
            checkboxNames[n] = checkboxNames[n] || [];
            checkboxNames[n].push(this);
          });
          $.each(checkboxNames, function (name, elements) {
            const $group = $(elements);
            const required = $group.first().prop("required");
            if (required && !$group.is(":checked")) {
              showGroupError($group, settings.messages.required);
              valid = false;
            } else if ($group.is(":checked")) clearError($group.first());
          });
          return valid;
        },
        clearErrors: function () {
          form.find(`.${settings.errorClass}`).removeClass(settings.errorClass);
          form.find(`.${settings.errorSpanClass}`).remove();
        },
      });
    });
  };
})(jQuery);
