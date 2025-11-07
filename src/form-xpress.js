/*!
 * FormXpress
 * Universal jQuery Auto-Validation & Smart-Upload Plugin
 * Author: Masum
 */
(function ($) {
  $.fn.FormXpress = function (options) {
    const settings = $.extend(
      {
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
      },
      options
    );

    /* ---------- Inject Recommended CSS once ---------- */
    if (!$("#FormXpressCSS").length) {
      $("head").append(`
                <style id="FormXpressCSS">
                    .${settings.errorClass} {
                        border-color:#e74c3c!important;outline:none;
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

      if (type === "number") {
        const numVal = parseFloat(val);
        if (isNaN(numVal)) return settings.messages.number;
        if (min && numVal < parseFloat(min))
          return settings.messages.min.replace("{min}", min);
        if (max && numVal > parseFloat(max))
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
          preview.css("border-color", "#e74c3c");
          fileName
            .css("color", "#e74c3c")
            .text(`❌ ${file.name} - ${fileError}`);
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
          files.forEach((file, idx) => {
            const error = validateFile(file);
            if (!error) {
              formData.append(name + "[]", file);
            }
          });
        } else if (type === "checkbox" || type === "radio") {
          if (input.is(":checked")) {
            formData.append(name, input.val());
          }
        } else {
          formData.append(name, input.val());
        }
      });

      // beforeSubmit hook
      if (
        settings.beforeSubmit &&
        settings.beforeSubmit(form, formData) === false
      ) {
        submitBtn
          .prop("disabled", false)
          .text(submitBtn.data("originalText") || "Submit");
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
        submitBtn
          .prop("disabled", false)
          .text(submitBtn.data("originalText") || "Submit");

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
        submitBtn
          .prop("disabled", false)
          .text(submitBtn.data("originalText") || "Submit");
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
      const submitBtn = settings.submitButton
        ? form.find(settings.submitButton)
        : form.find('button[type="submit"]');

      // Store original button text
      submitBtn.data("originalText", submitBtn.text());

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

        // Validate text inputs
        form
          .find("input:not([type='file']), textarea, select")
          .each(function () {
            const input = $(this);
            const error = validateInput(input);
            if (error) {
              showError(input, error);
              valid = false;
            } else clearError(input);
          });

        // Validate file inputs
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

        submitBtn.prop("disabled", true).text("Submitting...");

        if (settings.ajax) {
          uploadWithProgress(form, submitBtn);
        } else {
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
        },
        validate: function () {
          let valid = true;
          form.find("input, textarea, select").each(function () {
            const input = $(this);
            const error = validateInput(input);
            if (error) {
              showError(input, error);
              valid = false;
            } else clearError(input);
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
