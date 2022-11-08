# frozen_string_literal: true

RSpec.describe "Navigation", type: :system, js: true do
  fab!(:category) { Fabricate(:category) }
  fab!(:topic) { Fabricate(:topic) }
  fab!(:post) { Fabricate(:post, topic: topic) }
  fab!(:user) { Fabricate(:admin) }
  fab!(:category_channel) { Fabricate(:category_channel) }
  fab!(:message) { Fabricate(:chat_message, chat_channel: category_channel) }
  let(:chat_page) { PageObjects::Pages::Chat.new }

  before do
    # ensures we have one valid registered admin
    user.activate

    SiteSetting.chat_enabled = true
    SiteSetting.chat_allowed_groups = Group::AUTO_GROUPS[:everyone]
    category_channel.add(user)

    sign_in(user)
  end

  context "when visiting /chat" do
    it "opens full page" do
      chat_page.open_full_page

      expect(page).to have_current_path(
        chat.channel_path(category_channel.id, category_channel.slug),
      )
      expect(page).to have_css("html.has-full-page-chat")
      expect(page).to have_css(".chat-message-container[data-id='#{message.id}']")
    end
  end

  context "when opening chat" do
    it "opens the drawer by default" do
      visit("/")
      chat_page.open_from_header

      expect(page).to have_css(".topic-chat-container.expanded.visible")
    end
  end

  context "when opening chat with full page as preferred mode" do
    it "opens the full page" do
      visit("/")
      chat_page.open_from_header
      chat_page.maximize_drawer

      expect(page).to have_current_path(
        chat.channel_path(category_channel.id, category_channel.slug),
      )

      visit("/")
      chat_page.open_from_header

      expect(page).to have_current_path(
        chat.channel_path(category_channel.id, category_channel.slug),
      )
    end
  end

  context "when opening chat with drawer as preferred mode" do
    it "opens the full page" do
      chat_page.open_full_page
      chat_page.minimize_full_page

      expect(page).to have_css(".topic-chat-container.expanded.visible")

      visit("/")
      chat_page.open_from_header

      expect(page).to have_css(".topic-chat-container.expanded.visible")
    end
  end

  context "when collapsing full page with no previous state" do
    it "redirects to home page" do
      chat_page.open_full_page
      chat_page.minimize_full_page

      expect(page).to have_current_path(latest_path)
    end
  end

  context "when collapsing full page with previous state" do
    it "redirects to previous state" do
      visit("/t/-/#{topic.id}")
      chat_page.open_from_header
      chat_page.maximize_drawer
      chat_page.minimize_full_page

      expect(page).to have_current_path("/t/#{topic.slug}/#{topic.id}")
      expect(page).to have_css(".chat-message-container[data-id='#{message.id}']")
    end
  end
end