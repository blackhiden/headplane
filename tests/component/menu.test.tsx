import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Menu, MenuContent, MenuItem, MenuTrigger } from "~/components/menu";

describe("MenuTrigger", () => {
  test("forwards an accessible name to icon-only triggers", () => {
    render(
      <Menu>
        <MenuTrigger aria-label="More actions">
          <svg aria-hidden="true" />
        </MenuTrigger>
        <MenuContent>
          <MenuItem>Action</MenuItem>
        </MenuContent>
      </Menu>,
    );

    expect(screen.getByRole("button", { name: "More actions" })).toBeInTheDocument();
  });
});
