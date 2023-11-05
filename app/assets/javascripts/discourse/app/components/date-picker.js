import discourseComputed, { on } from "discourse-common/utils/decorators";
import Component from "@ember/component";
import I18n from "I18n";
/* global Pikaday:true */
import loadScript from "discourse/lib/load-script";
import { schedule } from "@ember/runloop";

// const DATE_FORMAT = "jYYYY-jMM-jDD";

export default Component.extend({
  classNames: ["date-picker-wrapper"],
  _picker: null,
  value: null,

  @discourseComputed("site.mobileView")
  inputType(mobileView) {
    return mobileView ? "date" : "text";
  },

  @on("didInsertElement")
  _loadDatePicker() {
    if (this.site.mobileView) {
      this._loadNativePicker();
    } else {
      const container = document.getElementById(this.containerId);
      this._loadPikadayPicker(container);
    }
  },

  _loadPikadayPicker(container) {
    loadScript("/javascripts/pikaday.js").then(() => {
      schedule("afterRender", () => {
        const options = {
          field: this.element.querySelector(".date-picker"),
          container: container || null,
          bound: container === null,
          format: "YYYY-MM-DD",
          firstDay: 0,
          isRTL: true,
          i18n: {
            previousMonth: "ماه قبل",
            nextMonth: "ماه بعد",
            months: [
              "فروردین",
              "اردیبهشت",
              "خرداد",
              "تیر",
              "مرداد",
              "شهریرور",
              "مهر",
              "آبان",
              "آذر",
              "دی",
              "بهمن",
              "اسفند",
            ],
            weekdays: [
              "یک‌شنبه",
              "دو‌شنبه",
              "سه‌‌شنبه",
              "چهار‌شنبه",
              "پنچ‌شنبه",
              "‌جمعه",
              "شنبه",
            ],
            weekdaysShort: ["ی", "د", "س", "چ", "پ", "ج", "ش"],
          },
          onSelect: (date) => this._handleSelection(date),
        };

        this._picker = new Pikaday(Object.assign(options, this._opts()));
      });
    });
  },

  _loadNativePicker() {
    const picker = this.element.querySelector("input.date-picker");
    picker.onchange = () => this._handleSelection(picker.value);
    picker.hide = () => {
      /* do nothing for native */
    };
    picker.destroy = () => {
      /* do nothing for native */
    };
    this._picker = picker;
  },

  _handleSelection(value) {
    this.set("value", moment(value.toString()).format("jYYYY-jMM-jDD"));
    const formattedDate = moment(value.toString()).format("YYYY-MM-DD");
    if (!this.element || this.isDestroying || this.isDestroyed) {
      return;
    }
    if (this.onSelect) {
      this.onSelect(formattedDate);
    }
  },

  @on("willDestroyElement")
  _destroy() {
    if (this._picker) {
      this._picker.destroy();
      this._picker = null;
    }
  },

  @discourseComputed()
  placeholder() {
    return I18n.t("dates.placeholder");
  },

  _opts() {
    return null;
  },
});
